var async = require("async"),
    dive = require("dive"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    path = require("path"),
    _ = require("underscore");

module.exports = (function () {
    var i18nModel = mongoose.model("I18n"),
        i18nString = mongoose.model("I18nString");

    function extract (root, file, options, cb) {
        fs.readFile(file, function (err, data) {
            var placeholders = data.toString().match(/\{\{\#i18n\}\}(.*?)\{\{\/i18n\}\}/ig),
                path = "/nls" + root;

            if (placeholders) {
                async.map(_.uniq(placeholders), function (placeholder, cb) {
                    var string = new i18nString();
                    string.set({
                        locale: options.nativeLanguage,
                        path: path,
                        key: placeholder.replace("{{#i18n}}", "").replace("{{/i18n}}", ""),
                        value: ""
                    });

                    string.save(function (err, doc) {
                        if (err && err.code == 11000) {
                            i18nString.findOne({locale: options.nativeLanguage, path: path, key: placeholder.replace("{{#i18n}}", "").replace("{{/i18n}}", "")}, function (err, doc) {
                                cb(err, doc);
                            });

                            return;
                        }

                        cb(err, string);
                    });
                }, function (err, result) {
                    i18nModel.findOne({path: path, locale: options.nativeLanguage}, function (err, doc) {
                        var locale;

                        if (!err && !doc) {
                            locale = new i18nModel();

                            locale.set({
                                content: result,
                                root: true,
                                locale: options.nativeLanguage,
                                path: path
                            }).save(function () {
                                if (typeof cb === "function") {
                                    cb();
                                }
                            });
                        } else {
                            doc.set({
                                content: result
                            }).save(function () {
                                if (typeof cb === "function") {
                                    cb();
                                }
                            });
                        }
                    });
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

        options.templatePath = path.normalize(options.templatePath);

        dive(options.templatePath, function (err, file) {
            var root;

            if (err) {
                return;
            }

            root = path.normalize(file.replace(options.templatePath, "/").replace(/.[^.]+$/, ""));

            extract(root, file, options, function () {
                fs.watch(file, function () {
                    extract(root, file, options);
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