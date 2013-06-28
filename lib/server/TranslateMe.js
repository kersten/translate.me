var _ = require("underscore")._,
    l = require("locale"),
    async = require("async"),
    express = require("express"),
    TranslationIndex = require("./parser/TranslationIndex"),
    Translator = require('../shared/translator.umd.js'),
    mongoose = require("mongoose"),
    TranslationModel = mongoose.model("translation", require('./TranslationSchema')),
    helpers = require('../shared/handlebars-helpers.umd.js'),
    RequestHandler = require('./RequestHandler');

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
 * - .js: *.translate("key", "namespace");
 *
 * @public
 * @param {String[]} directories a directory or an array of directories where to search for translation statements
 * @param {String} projectDirectory the path to the project root, never null
 * @param {Function} [callback] a function which will be called, when the operation finished
 */
TranslateMe.prototype.generateDefaultTranslations = function(directories, projectDirectory, callback) {
    'use strict';

    if(!directories) {
        throw "Please pass a directory or list of directories to check for translation statements.";
    }

    TranslationModel.ensureIndexes(function(err) {
        var index = new TranslationIndex();

        if(!err) {
            async.mapSeries(directories, function(directory, done) {
                index.build(directory, projectDirectory, function(err, translations) {
                    if(!err) {
                        async.mapSeries(translations, function(translation, done) {
                            if(translation.key) {
                                TranslationModel.getTranslationModel(translation, function(err, model) {
                                    if(!err && model && model.isModified()) {
                                        model.save(done);
                                    } else {
                                        done(err);
                                    }
                                });
                            } else {
                                done();
                            }
                        }, done);
                    } else {
                        done(err);
                    }
                });
            }, function(err, result) {
                var newTranslations;

                if(!err && result) {
                    newTranslations = _.without(_.flatten(result), undefined);
                    callback(null, newTranslations);
                } else {
                    callback(err);
                }
            });
        } else {
            callback(err);
        }
    });
};

/**
 * Registers all necessary middleware to the passed express app to enable translation.
 *
 * @param app express app to register the translation ui to
 */
TranslateMe.prototype.registerRoutes = function(app) {
    'use strict';
    var apiRoot = "/translate.me/api/json",
        requestHandler = new RequestHandler(this.supportedLocales);

    if(!app) {
        throw "Please pass an express app object.";
    }

    app.post(apiRoot + '/translations', requestHandler.createTranslation);
    app.get(apiRoot + '/translations', requestHandler.getTranslations);
    app.put(apiRoot + '/translations/:_id', requestHandler.updateTranslation);
    app.get(apiRoot + '/locales', requestHandler.getLocales);
    app.get(apiRoot + '/namespaces', requestHandler.getNamespaces);
    app.get(apiRoot + "/stats", requestHandler.stats);
    app.all('*', function(req, res, next) {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        next();
    });
};

TranslateMe.prototype.registerMiddlewares = function(app) {
    'use strict'
    var root = '/translate.me';

    if(!app) {
        throw "Please pass an express app object.";
    }
    app.use(l(this.locales));
    app.use(root, express.static(__dirname + '/../browser', {maxAge: 0}));
    app.use(root, express.static(__dirname + '/../shared', {maxAge: 0}));
    app.use(root + '/admin/components', express.static(__dirname + '/../../components', {maxAge: 0}));
    app.use(root + '/admin', express.static(__dirname + '/../../public', {maxAge: 0}));
}

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

                    createMaster: function(namespace, key, done) {
                        TranslationModel.getTranslationModel({
                            namespace: namespace,
                            key: key
                        }, function(err, model) {
                            if(!err && model) {
                                if(!model.isStatic()) {
                                    model.save(function(err, model) {
                                        if(!err && model) {
                                            done(null, model.toObject());
                                            console.log("Created new dynamic translation: \"" + model.namespace + ":" + model.key + "\"");
                                        } else {
                                            done(new Error("Could not save new master."));
                                            // TODO Proper logging
                                            console.log("Tried to create new master translation, but could not save it.");
                                        }
                                    });
                                } else {
                                    done(null, model.toObject());
                                }
                            } else {
                                done(new Error("Could not initialize new master."));
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
