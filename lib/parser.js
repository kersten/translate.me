var async = require("async"),
    dive = require("dive"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    Path = require("path"),
    _ = require("underscore")._,
    esprima = require('esprima'),
    traverse = require("traverse"),
    Handlebars = require("handlebars"),
    i18nString = require("./I18nSchema");

module.exports = (function () {

    function extract (file, defaultLocale) {
        if(file && defaultLocale) {
            fs.readFile(file, function (err, data) {
                var translations;
                if(file.match(/^.*\.mustache$/)) {
                    try {
                        translations = extractTranslationsFromHandlebarsContent(data.toString());
                    } catch (err) {
                        console.log("Could not extract translations from: " + file + ". Exception:\n" + err);
                    }
                } else if (file.match(/^.*\.js$/)) {
                    translations = extractTranslationsFromJavascriptContent(data.toString());
                }

                _.each(translations, function(translation) {
                    var data = {};

                    if(translation.key) {
                        data.key = translation.key;
                        data.locale = defaultLocale;
                        if(translation.namespace) {
                            data.path = translation.namespace;
                        } else {
                            data.path = "";
                        }

                        i18nString.create(data, function() {});
                    }
                });
            });
        }
    }

    this.parse = function (paths, locale, callback) {
        paths.forEach(function (path) {
            path = Path.normalize(path);

            dive(path, function (err, file) {
                if (!err) {
                    extract(file, locale);
                }
            }, callback);
        });
    };

    function extractTranslationsFromHandlebarsContent(content) {
        var syntax = Handlebars.parse(content),
            translations = [];

        traverse.map(syntax, function(node) {
            var translation = {};
            if(node && node.type && node.type === "mustache" && node.id && node.id.type && node.id.type === "ID"
                && node.id.string === "i18n" && node.params) {
                _.each(node.params, function(parameter) {
                    if(parameter && parameter.type && (!translation.key || !translation.namespace) && parameter.type === "STRING") {
                        if(parameter.string.substring(0, 3) === 'ns:') {
                            translation.namespace = parameter.string.substring(3);
                        } else if(parameter.string.indexOf(':') < 0) {
                            translation.key = parameter.string;
                        }
                    }
                });
                translations.push(translation);
            }
        });

        return translations;
    }

    function extractTranslationsFromJavascriptContent(content) {
        var syntax = esprima.parse(content),
            translations = [];

        traverse.map(syntax, function(node) {
            var translation = {};
            if(node && node.type === "CallExpression" && node.callee && node.callee.type === "MemberExpression"
                && node.callee.object.name === "_" && node.callee.property.name === "translate") {
                _.each(node.arguments, function(argument) {
                    if((!translation.key || !translation.namespace) && argument.type === "Literal") {
                        if(argument.value.substring(0, 3) === 'ns:') {
                            translation.namespace = argument.value.substring(3);
                        } else if(argument.value.indexOf(':') < 0) {
                            translation.key = argument.value;
                        }
                    }
                })
                translations.push(translation);
            }
        });

        return translations;
    }

    return this;
})();
