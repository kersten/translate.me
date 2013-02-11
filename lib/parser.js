var async = require("async"),
    dive = require("dive"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    Path = require("path"),
    _ = require("underscore")._;

require("./I18nSchema");

module.exports = (function () {
    var i18nModel = mongoose.model("I18n"),
        i18nString = mongoose.model("I18nString");

    function extract (root, file, options, cb) {
        fs.readFile(file, function (err, data) {
            var placeholders = data.toString().match(/\{\{i18n(?!\}|$)[^\}"]*(("[^"]*")[^\}"]*)*[^\}"]?\}\}/g);

            if (placeholders) {
                async.map(_.uniq(placeholders), function (placeholder, cb) {
                    var namespace = "default", value = "", re = /("((\\.|[^\\"])*[^\"]*?)")/g;

                    placeholder = placeholder.replace("^{{i18n", "").replace("}}$", "").match(re);

                    _.each(placeholder, function (key, i) {
                        key = key.replace(/^"/, "").replace(/"$/, "");

                        if (i > 1) {
                            return;
                        }

                        if (placeholder.length !== 1 && i === 0) {
                            namespace = key;
                            return;
                        }

                        value = key;
                    });

                    i18nString.update({locale: options.nativeLanguage, path: namespace, key: value}, {
                        locale: options.nativeLanguage,
                        path: namespace,
                        key: value,
                        value: ""
                    }, {upsert: true}, function (err) {
                        cb(err);
                    });
                }, function () {
                    if (_.isFunction(cb)) {
                        cb.call();
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
        if (!options || !options.paths) {
            throw "No template path given";
            return;
        }

        options.paths.forEach(function (path) {
            path = Path.normalize(path);

            dive(path, function (err, file) {
                var root;

                if (err) {
                    return;
                }

                root = Path.normalize(file.replace(path, "/").replace(/.[^.]+$/, ""));

                if (options.removeFromPath) {
                    if (!options.removeFromPath.forEach) {
                        options.removeFromPath = [options.removeFromPath];
                    }

                    options.removeFromPath.forEach(function (remove) {
                        root = root.replace(remove, "");
                    });
                }

                extract(root, file, options, function () {
                    /*fs.watch(file, function () {
                        extract(root, file, options);
                    });*/
                });
            }, function () {
                if (typeof cb === "function") {
                    cb();
                }
            });
        });
    };

    return this;
})();
