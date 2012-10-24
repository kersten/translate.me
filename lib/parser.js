var dive = require("dive"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    path = require("path");

module.exports = (function () {
    var i18nModel;

    function extract (root, file, cb) {
        var i18n = {};

        fs.readFile(file, function (err, data) {
            var placeholders = data.toString().match(/\{\{\#i18n\}\}(.*?)\{\{\/i18n\}\}/ig),
                path = "/nls" + root;

            if (placeholders) {
                placeholders.forEach(function (placeholder) {
                    if (i18n === undefined) {
                        i18n = {};
                    }

                    i18n[placeholder.replace("{{#i18n}}", "").replace("{{/i18n}}", "")] = "";
                });

                i18nModel.findOne({path: path}, function (err, doc) {
                    var locale;

                    if (!err && !doc) {
                        locale = new i18nModel();

                        locale.set({
                            content: i18n,
                            root: true,
                            path: path
                        }).save(function () {
                            if (typeof cb === "function") {
                                cb();
                            }
                        });
                    } else {
                       doc.set({
                           content: i18n
                       }).save(function () {
                           if (typeof cb === "function") {
                               cb();
                           }
                       });
                    }
                });

                return;
            }

            if (typeof cb === "function") {
                cb();
            }
        });
    }

    this.parse = function (options, cb) {
        if (!options || !options.templatePath) {
            throw "No template path given";
            return;
        }

        i18nModel = options.db.model("I18n");

        options.templatePath = path.normalize(options.templatePath);

        dive(options.templatePath, function (err, file) {
            var root;

            if (err) {
                return;
            }

            root = path.normalize(file.replace(options.templatePath, "/").replace(/.[^.]+$/, ""));

            extract(root, file, function () {
                fs.watch(file, function () {
                    extract(root, file);
                });
            });
        }, function () {
            if (typeof cb === "function") {
                cb();
            }
        });
    };

    return this;
})();