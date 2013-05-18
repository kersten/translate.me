var _ = require("underscore")._,
    l = require("locale"),
    express = require("express"),
    parser = require("./parser/translation-parser"),
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
    var root = "/translate.me",
        apiRoot = root + "/api/json",
        requestHandler = new RequestHandler(this.supportedLocales);

    if(!app) {
        throw "Please pass an express app object.";
    }

    app.use(l(this.locales));
    app.use(root, express.static(__dirname + "/../browser", {maxAge: 86400000}));
    app.use(root, express.static(__dirname + "/../shared", {maxAge: 86400000}));

    if(enableAdminUI) {
        app.use(root + '/admin', express.static(__dirname + "/../../public"));
        app.post(apiRoot + '/search', requestHandler.searchTranslations);
        app.get(apiRoot + '/translations', requestHandler.getTranslationsLegacy);
        app.put(apiRoot + '/translations/:id', requestHandler.updateTranslationsLegacy);
        app.get(apiRoot + '/locales', requestHandler.getLocales);
        app.get(apiRoot + '/namespaces', requestHandler.getNamespaces);
    }

    app.post(apiRoot + '/translations', requestHandler.createTranslation);
    app.get(apiRoot + '/translations/new', requestHandler.getTranslations);
    app.get(apiRoot + "/stats", requestHandler.stats);
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
                                if(model.isStatic()) {
                                    model.save(function(err, model) {
                                        if(!err && model) {
                                            created(model.toObject());
                                        } else {
                                            // TODO Proper logging
                                            console.log("Tried to create new master translation, but could not save it.");
                                        }
                                    });
                                } else {
                                    created(model.toObject());
                                }
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
