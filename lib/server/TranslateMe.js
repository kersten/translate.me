var _ = require("underscore")._,
    l = require("locale"),
    express = require("express"),
    parser = require("./parser/translation-parser"),
    Translator = require('../shared/translator.umd.js'),
    mongoose = require("mongoose"),
    TranslationModel = mongoose.model("translation", require('./TranslationSchema')),
    helpers = require('../shared/handlebars-helpers.umd.js'),
    // TODO add following to translate.me
    root = "/translate.me",
    apiRoot = root + "/api/json";

/**
 * Creates a new TranslateMe object.
 *
 * @param {String} mongoURL an URL of a mongo db to create the translations in
 * @param {String} masterLocale a default country code, which language the translation statements represent
 * @param {String[]} translatableLocales a list of locales, which shall be supported by the system
 * @constructor
 */
function TranslateMe (mongoURL, masterLocale, translatableLocales) {
    'use strict';

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
};

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

    app.use(root, express.static(__dirname + "/../browser", {maxAge: 86400000}));
    app.use(root, express.static(__dirname + "/../shared", {maxAge: 86400000}));
    app.use(l(this.locales));

    if(enableAdminUI) {
        app.use(root + '/admin', express.static(__dirname + "/../../public"));
        app.post(root + '/admin/search', function (req, res) {
            var query = TranslationModel.find({
                $or: [{
                    key: new RegExp(req.param('q'), 'i')
                }, {
                    translations: {
                        $elemMatch: {
                            locale: req.param('locale'),
                            value: new RegExp(req.param('q'), 'i')
                        }
                    }
                }]
            }).lean();

            if (req.param('namespace')) {
                query.where('namespace', req.param('namespace'));
            }

            query.exec(function (err, models) {
                var translations = [],
                    locales = req.param('locale') ? _.flatten([req.param('locale')]) : self.supportedLocales;

                if (err) {
                    res.status(500);
                    res.send(err);

                    return;
                }

                _.each(models, function(model) {
                    _.each(TranslationModel.toOldModel(model, locales, true), function(oldModel) {
                        translations.push(oldModel);
                    });
                });

                res.send(translations);
            });
        });
    }

    // Get translations. Still returns old structure
    app.get(apiRoot + '/translations', function(req, res) {
        var locales = req.param('locale') ? _.flatten([req.param('locale')]) : self.supportedLocales,
            namespaces = req.param('namespace'),
            emulateMissingTranslations = req.param('emulateMissingTranslations'),
            query = TranslationModel.find();

        if(namespaces !== undefined && !_.isEmpty(namespaces)) {
            query.where('namespace', namespaces);
        }
        query.lean();
        query.exec(function(err, models) {
            var translations;
            if(!err && models) {
                translations = [];
                _.each(models, function(model) {
                    _.each(TranslationModel.toOldModel(model, locales, emulateMissingTranslations), function(oldModel) {
                        translations.push(oldModel);
                    });
                });
                res.type(express.mime.types.json);
                res.end(JSON.stringify(translations));
            } else {
                res.send(500, "Sorry. Couldn't retrieve the translations. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Update existing translation. Still returns old structure
    app.put(apiRoot + '/translations/:id', function(req, res) {
        var translation = req.body;

        TranslationModel.findById(translation._id,function(err, translationModel) {
            if(!err && translationModel) {
                translationModel.translate(translation.locale, translation.value);
                translationModel.save(function(err, updatedModel) {
                    if(!err && updatedModel) {
                        res.type(express.mime.types.json);
                        res.end(JSON.stringify(TranslationModel.toOldModel(updatedModel, translation.locale)));
                    } else {
                        res.send(500, "Sorry. Couldn't update the translation. Here's the error: " + JSON.stringify(err));
                    }
                });
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
                        res.type(express.mime.types.json);
                        res.end(JSON.stringify(model));
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
        });
        res.type(express.mime.types.json);
        res.end(JSON.stringify(locales));
    });

    app.get(apiRoot + '/namespaces', function(req, res) {
        TranslationModel.distinct('namespace').exec(function (err, namespaces) {
            if(!err && namespaces) {
                res.type(express.mime.types.json);
                res.end(JSON.stringify(namespaces));
            } else {
                res.send(500, "Sorry. Couldn't retrieve namespaces. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(apiRoot + "/stats", function(req, res) {
        TranslationModel.find().lean().exec(function(err, translationModels) {
            var result, statsByLocale;

            if(!err && translationModels) {
                statsByLocale = {};
                _.each(self.supportedLocales, function(locale) {
                    statsByLocale[locale] = {
                        numberOfTranslations: 0
                    };
                });
                _.each(translationModels, function(translationModel) {
                    _.each(translationModel.translations, function(t) {
                        statsByLocale[t.locale].numberOfTranslations += 1;
                    });
                });
                statsByLocale[l.Locale['default'].toString()].numberOfTranslations = translationModels.length;

                result = {};
                result.masterLocale = l.Locale['default'].toString();
                result.numberOfTranslations = translationModels.length;
                result.translatedLocales = statsByLocale;

                res.type(express.mime.types.json);
                res.end(JSON.stringify(result));
            } else {
                res.send(500, "Sorry. Couldn't create stats. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(apiRoot + '/translations/new', function(req, res) {
        TranslationModel.find().select('-_id key namespace translations.locale translations.value').lean().exec(function(err, masterTranslations) {
            var result;
            if(!err && masterTranslations) {
                result = [];
                _.each(masterTranslations, function(masterTranslation) {
                    result.push(masterTranslation);
                });
                res.type(express.mime.types.json);
                res.end(JSON.stringify(result));
            } else {
                res.send(500, "Sorry. Couldn't retrieve masters. Here's the error: " + JSON.stringify(err));
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
    'use strict';

    var self = this;

    if(this.translator === undefined) {
        // Cache translations
        TranslationModel.find().lean().exec(function(err, translationModels) {
            if(!err && translationModels) {
                self.translator = new Translator({
                    get: function(done) {
                        done(translationModels);
                    },

                    createMaster: function(namespace, key, created) {
                        TranslationModel.getTranslationModel({
                            namespace: namespace,
                            key: key,
                            sources: ['dynamic']
                        }, function(err, model) {
                            if(!err && model) {
                                model.save(function(err, model) {
                                    if(!err && model) {
                                        created(model.toObject());
                                    } else {
                                        // TODO Proper logging
                                        console.log("Tried to create new master translation, but could not save it.");
                                    }
                                });
                            } else {
                                // TODO Proper logging
                                console.log("Could not create master", err);
                            }
                        });
                    }
                }, l.Locale['default'].toString());

                if(_.isFunction(ready)) {
                    ready(self.translator);
                }
            } else {
                throw new Error("Could not cache translations. Here's the error: " + JSON.stringify(err));
            }
        });
    }

    return this.translator;
};

TranslateMe.prototype.registerHelpers = function(handlebars) {
    handlebars.registerHelper('namespace', helpers.createNamespaceBlockHelper());
    handlebars.registerHelper('translation', helpers.createTranslationBlockHelper(this.getTranslator()));
}

module.exports = TranslateMe;
