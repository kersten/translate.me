var _ = require("underscore")._,
    l = require("locale"),
    express = require("express"),
    parser = require("./parser/translation-parser"),
    Translator = require('../shared/translator.umd.js'),
    mongoose = require("mongoose"),
    TranslationModel = mongoose.model("translation", require('./TranslationSchema')),
    // TODO add following to translate.me
    root = "/translate.me",
    apiRoot = root + "/api/:format";

/**
 * Creates a new TranslateMe object.
 *
 * @param {String} mongoURL an URL of a mongo db to create the translations in
 * @param {String} masterLocale a default country code, which language the translation statements represent
 * @param {String[]} translatableLocales a list of locales, which shall be supported by the system
 * @constructor
 */
TranslateMe = function (mongoURL, masterLocale, translatableLocales) {
    if(!mongoURL) {
        throw "Please pass a mongo URL to connect to.";
    }
    if(!masterLocale) {
        throw "Please pass a locale.";
    }
    if(!translatableLocales) {
        throw "Please pass at least one other locale which should be translatable by the user.";
    }

    mongoose.connect(mongoURL);
    l.Locale['default'] = new l.Locale(masterLocale);
    this.supportedLocales = _.union(translatableLocales, [masterLocale]);
    this.locales = new l.Locales(_.uniq(this.supportedLocales));
}

/**
 * Determines the best locale, based on the passed acceptLanguage string.
 *
 * @param {string} acceptLanguage value of the acceptLanguage http header property
 * @returns {string} best locale for the passed acceptLanguage string
 */
TranslateMe.prototype.bestLocale = function(acceptLanguage) {
    'use strict';

    var locales = new l.Locales(acceptLanguage);
    return locales.best(this.locales).language;
};

/**
 * Generates translations entries in a mongo-db, based on the translation statements in the files of the passed
 * directories. Currently supported are javascript and mustache files. The translation statements are as following:
 *
 * - .mustache: {{translation key="key" namespace="namespace"}}
 * - .js: _.translate("key", "ns:namespace", parameters);
 *
 * @public
 * @param {String|String[]} directories a directory or an array of directories where to search for translation statements
 * @param {Function} [callback] a function which will be called, when the operation finished
 */
TranslateMe.prototype.generateDefaultTranslations = function(directories, callback) {
    'use strict';

    if(!directories) {
        throw "Please pass a directory or list of directories to check for translation statements.";
    }
    parser.parse(directories, callback);
}

/**
 * Registers all necessary middleware to the passed express app to enable translation.
 *
 * @param app express app to register the translation ui to
 * @param {Boolean} [enableAdminUI] true to enable the admin-ui, otherwise false or undefined
 */
TranslateMe.prototype.registerRoutes = function(app, enableAdminUI) {
    'use strict';

    if(!app) {
        throw "Please pass an express app object.";
    }
    var self = this;

    app.use(root, express.static(__dirname + "/../browser"));
    app.use(root, express.static(__dirname + "/../shared"));
    app.use(l(this.locales));

    if(enableAdminUI) {
        app.use(root + '/admin', express.static(__dirname + "/../../public"));
        app.post(root + '/admin/search', function (req, res) {
            /* TODO @Kersten: Could you please adjust this?
            self.translationStore.getTranslations({
                locale: req.param('locale'),
                $or: [{key: new RegExp(req.param('q'), 'i')}, {value: new RegExp(req.param('q'), 'i')}]
            }, function (err, docs) {
                if (err) {
                    res.status(500);
                    res.send(err);

                    return;
                }

                res.send(docs);
            });
            */
        });
    }

    app.all(apiRoot + "/*", function(req, res, next) {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        switch(req.param('format')) {
            case 'json':
                res.sendData = function(object) {
                    res.type(express.mime.types.json).end(JSON.stringify(object));
                };
                break;
            default:
                res.send(500, "Sorry. Couldn't do anything. Output format: \"" + req.param('format') + "\" is unknown.");
                return;
                break;
        }

        next();
    });

    // Get translations. Still returns old structure
    app.get(apiRoot + '/translations', function(req, res) {
        var locales = req.param('locale') ? _.flatten([req.param('locale')]) : self.supportedLocales,
            namespaces = req.param('namespace'),
            emulateMissingTranslations = req.param('emulateMissingTranslations');

        var query = TranslationModel.find();
        if(namespaces !== undefined) {
            query.where('namespace', namespaces);
        }
        query.exec(function(err, models) {
            var translations;
            if(!err && models) {
                translations = [];
                _.each(models, function(model) {
                    _.each(model.toOldModel(locales, emulateMissingTranslations), function(oldModel) {
                        translations.push(oldModel);
                    });
                });
                res.sendData(translations);
            } else {
                res.send(500, "Sorry. Couldn't retrieve the translations. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Update existing translation. Still returns old structure
    app.put(apiRoot + '/translations/:id', function(req, res) {
        var translation = req.body;

        TranslationModel.findByIdAndUpdate(translation._id, {
            translations: [{
                locale: translation.locale,
                value: translation.value,
                changed: new Date()
            }]
        }, function(err, updatedModel) {
            if(!err && updatedModel) {
                res.sendData(updatedModel.toOldModel(translation.locale));
            } else {
                res.send(500, "Sorry. Couldn't update the translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Create or update translation
    app.post(apiRoot + '/translations', function(req, res) {
        var translation = {
            namespace: req.param('namespace'),
            key: req.param('key'),
            sources: [req.get('Referer')]
        };

        if(translation.namespace === undefined) {
            res.send(400, "Sorry. Couldn't create translation. Parameter 'namespace' is missing.");
            return;
        }
        if(translation.key === undefined || translation.key.length <= 0) {
            res.send(400, "Sorry. Couldn't create translation. Parameter 'key' is missing or empty.");
            return;
        }

        TranslationModel.getTranslationModel(translation, function(err, model) {
            if(!err && model) {
                model.save(function(err, model) {
                    if(!err && model) {
                        res.sendData(model);
                    } else {
                        res.send(500, "Sorry. Couldn't create translation. Here's the error: " + JSON.stringify(err));
                    }
                });
            } else {
                res.send(500, "Sorry. Couldn't create translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(apiRoot + '/locales', function(req, res) {
        var locales = [];
        _.each(self.supportedLocales, function(locale) {
            locales.push(locale);
        })
        res.sendData(locales);
    });

    app.get(apiRoot + '/namespaces', function(req, res) {
        TranslationModel.distinct('namespace').exec(function (err, namespaces) {
            if(!err && namespaces) {
                res.sendData(namespaces);
            } else {
                res.send(500, "Sorry. Couldn't retrieve namespaces. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(apiRoot + "/stats", function(req, res) {
        TranslationModel.find(function(err, translationModels) {
            var result, statsByLocale;

            if(!err && translationModels) {
                statsByLocale = {};
                _.each(self.supportedLocales, function(locale) {
                    statsByLocale[locale] = {
                        numberOfTranslations: 0
                    };
                })
                _.each(translationModels, function(translationModel) {
                    _.each(translationModel.translations, function(t) {
                        statsByLocale[t.locale].numberOfTranslations += 1;
                    })
                });
                statsByLocale[l.Locale['default'].toString()].numberOfTranslations = translationModels.length;

                result = {};
                result.masterLocale = l.Locale['default'].toString();
                result.numberOfTranslations = translationModels.length;
                result.translatedLocales = statsByLocale;

                res.sendData(result);
            } else {
                res.send(500, "Sorry. Couldn't create stats. Here's the error: " + JSON.stringify(err));
            }
        });
    });
};

/**
 * Returns an instance of a Translator. Can be used to translate on the server-side.
 *
 * @param {function(Translator)} ready which will be called when the Translator is ready to translate
 * @returns {Translator} a singleton of the translator
 */
TranslateMe.prototype.getTranslator = function(ready) {
    var translations = {};

    if(this.translator === undefined) {
        // Cache translations
        TranslationModel.find(function(err, translationModels) {
            if(!err && translationModels) {
                // Create an array which groups the translations in the following structure: [locale][namespace][key]
                _.each(translationModels, function(translationModel) {
                    _.each(translationModel.translations, function(t) {
                        if (!translations[t.locale]) {
                            translations[t.locale] = {};
                        }
                        if (!translations[t.locale][translationModel.namespace]) {
                            translations[t.locale][translationModel.namespace] = {};
                        }
                        translations[t.locale][translationModel.namespace][translationModel.key] = t.value;
                    });
                });

                if(_.isFunction(ready)) {
                    ready(this.translator);
                }
            } else {
                throw new Error("Could not cache translations. Here's the error: " + JSON.stringify(err));
            }
        });

        this.translator = new Translator({
            get: function(locale, namespace, key) {
                if(!_.isEmpty(translations)) {
                    if(translations[locale]
                        && translations[locale][namespace]
                        && translations[locale][namespace][key]) {
                        return translations[locale][namespace][key];
                    }
                } else {
                    throw new Error("Could not get translations. Invalid state. No translations are present.");
                }
            },

            createMaster: function(namespace, key) {
                TranslationModel.getTranslationModel({
                    namespace: namespace,
                    key: key,
                    sources: ['dynamic']
                }, function(err, model) {
                    if(!err && model) {
                        model.save();
                    } else {
                        // TODO Proper logging
                        console.log("Could not create master", err);
                    }
                });
            }
        }, l.Locale['default'].toString());
    }

    return this.translator;
}

module.exports = TranslateMe;
