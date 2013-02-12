var async = require("async"),
    dive = require("dive"),
    fs = require("fs"),
    mongoose = require("mongoose"),
    Path = require("path"),
    _ = require("underscore")._,
    esprima = require('esprima'),
    traverse = require("traverse");

require("./I18nSchema");

module.exports = (function () {
    var i18nString = mongoose.model("I18nString");

    function extract (file, options, callback) {
        if(file && options) {
            fs.readFile(file, function (err, data) {
                var translations;
                if(file.match(/^.*\.mustache$/)) {
                    translations = extractTranslationsFromHandlebarsContent(data.toString());
                } else if (file.match(/^.*\.js$/)) {
                    translations = extractTranslationsFromJavascriptContent(data.toString());
                }

                _.each(translations, function(translation) {
                    var model = {};

                    if(translation.key) {
                        model.key = translation.key;
                        model.locale = options.nativeLanguage;
                        if(translation.namespace) {
                            model.path = translation.namespace;
                        }

                        i18nString.create(model, function (err) {
                            if (err && _.isFunction(callback)) {
                                callback(err);
                            }
                        });
                    }
                });

                if (_.isFunction(callback)) {
                    callback(null);
                }
            });
        }
    }

    this.parse = function (options, callback) {
        if (!options || !options.paths) {
            throw "No template path given";
        }

        options.paths.forEach(function (path) {
            path = Path.normalize(path);

            dive(path, function (err, file) {
                if (!err) {
                    extract(file, options);
                }
            }, callback);
        });
    };

    function extractTranslationsFromHandlebarsContent(content) {
        var regexBlock = /\{\{i18n(.*?["\s])\}\}/g,
            translations = [],
            regexParameter, result, block, parameter, translation;

        while ((result = regexBlock.exec(content))) {
            block = result[1];
            regexParameter = /"(.*?[^\\])"/g;
            translation = {};

            while((!translation.namespace || !translation.key) && (result = regexParameter.exec(block))) {
                parameter = result[1];
                if(parameter.substring(0, 3) === "ns:") {
                    translation.namespace = parameter;
                } else {
                    translation.key = parameter;
                }
            }

            translations.push(translation);
        }

        return translations;
    }

    function extractTranslationsFromJavascriptContent(content) {
        var syntax = esprima.parse(content),
            translations = [], translation;

        traverse.map(syntax, function(node) {
            if(node && node.type === "CallExpression" && node.callee && node.callee.type === "MemberExpression"
                && node.callee.object.name === "_" && node.callee.property.name === "translate") {
                translation = {};
                _.each(node.arguments, function(argument) {
                    if((!translation.key || !translation.namespace) && argument.type === "Literal") {
                        if(argument.value.substring(0, 3) === 'ns:') {
                            translation.namespace = argument.value;
                        } else {
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
