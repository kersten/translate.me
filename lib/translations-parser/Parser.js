var async = require("async"),
    dive = require("dive"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    Path = require("path"),
    _ = require("underscore")._,
    parseHandlebarsFile = require("./HandlebarsParser"),
    parseJavascriptFile = require("./JavascriptParser"),
    TranslationModel = require("./../TranslationModel");

module.exports = (function () {

    function extract (file, defaultLocale) {
        if(file && defaultLocale) {
            fs.readFile(file, function (err, data) {
                var translations;
                if(file.match(/^.*\.mustache$/)) {
                    try {
                        translations = parseHandlebarsFile(data.toString());
                    } catch (err) {
                        console.log("Could not extract translations from: " + file + ". Exception:\n" + err);
                    }
                } else if (file.match(/^.*\.js$/)) {
                    translations = parseJavascriptFile(data.toString());
                }

                _.each(translations, function(translation) {
                    var data = {};

                    if(translation.key) {
                        data.key = translation.key;
                        data.locale = defaultLocale;
                        data.namespace = translation.namespace;

                        TranslationModel.create(data, function() {});
                    }
                });
            });
        }
    }

    this.parse = function (paths, locale, callback) {
        TranslationModel.ensureIndexes(function() {
            paths.forEach(function (path) {
                path = Path.normalize(path);

                dive(path, function (err, file) {
                    if (!err) {
                        extract(file, locale);
                    }
                }, callback);
            });
        });
    };

    return this;
})();
