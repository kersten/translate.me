var _ = require("underscore")._,
    async = require("async"),
    locale = require("locale"),
    mongoose = require("mongoose"),
    TranslationModel = require("./I18nSchema"),
    parser = require("./parser"),
    express = require("express");

/**
 * Creates a new RequirejsI18nMongoDB object.
 *
 * @param {String} mongoURL an URL of a mongo db to create the translations in
 * @param {String} defaultLocale a default country code, which language the translation statements represent
 * @param {String[]} supportedLocales a list of locales, which shall be supported by the system
 * @constructor
 */
TranslateMe = function (mongoURL, defaultLocale, supportedLocales) {
    // TODO Add real locale support not just languages.
    if(!mongoURL) {
        throw "Please pass a mongo URL to connect to.";
    }
    if(!defaultLocale) {
        throw "Please pass a locale.";
    }
    if(!supportedLocales) {
        throw "Please pass at least one other locale which should be supported by the system.";
    }

    locale.Locale['default'] = new locale.Locale(defaultLocale);
    this.supportedLocales = new locale.Locales(_.uniq(supportedLocales));

    mongoose.connect(mongoURL);
};

/**
 * Generates translations entries in a mongo-db, based on the translation statements in the files of the passed
 * directories. Currently supported are javascript and mustache files. The translation statements are as following:
 *
 * - .mustache: {{i18n "key" "ns:namespace"}}
 * - .js: _.translate("key", "ns:namespace", parameters);
 *
 * @public
 * @param {String|String[]} directories a directory or an array of directories where to search for translation statements
 * @param {Function} [callback] a function which will be called, when the operation finished
 */
TranslateMe.prototype.generateDefaultTranslations = function(directories, callback) {
    if(!directories) {
        throw "Please pass a directory or list of directories to check for translation statements.";
    }
    TranslationModel.ensureIndexes(function() {
        parser.parse(directories, locale.Locale['default'].toString(), callback);
    });
}

/**
 * Registers all necessary middleware to the passed express app to enable translation.
 *
 * @param app express app to register the translation ui to
 * @param {Boolean} [enableAdminUI] true to enable the admin-ui, otherwise false or undefined
 */
TranslateMe.prototype.registerRoutes = function(app, enableAdminUI) {
    if(!app) {
        throw "Please pass an express app object.";
    }

    if(enableAdminUI) {
        this.createTranslationAdminUIRoutes(app);
    }
    this.createTranslationServiceRoutes(app);
}

TranslateMe.prototype.createTranslationAdminUIRoutes = function(app) {
    app.use('/i18n/admin', express.static(__dirname + "/../public"));

    app.put('/i18n/admin/translations/:id', function(req, res) {
        TranslationModel.findByIdAndUpdate(req.param('id'), {value: req.body.value}, {new: true}, function(err, doc) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.end(JSON.stringify(doc));
            } else {
                res.status(404);
            }
        });
    });

    app.post('/i18n/admin/translations', function(req, res) {
        var translation = new TranslationModel({
            locale: req.body.locale,
            path: req.body.path,
            key: req.body.key,
            value: req.body.value
        });

        translation.save(function(err, model) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.end(JSON.stringify(model));
            } else {
                res.status(404);
            }
        });
    });

    app.get('/i18n/admin/translations', function(req, res) {
        async.parallel({
            allTranslations: function(callback) {
                TranslationModel.find({
                    path: req.param('path'),
                    locale: locale.Locale['default'].toString()
                }).exec(callback);
            },
            requestedTranslations: function(callback) {
                if(locale.Locale['default'].toString() !== req.param('locale')) {
                    TranslationModel.find({
                        path: req.param('path'),
                        locale: req.param('locale')
                    }).exec(callback);
                } else {
                    callback(null);
                }
            }
        }, function(err, results) {
            var translations = [];
            if(!err) {
                if(results.requestedTranslations) {
                    _.each(results.allTranslations, function(translation) {
                        translation._id = null;
                        translation.value = null;
                        _.find(results.requestedTranslations, function(translatedTranslation) {
                            if(translatedTranslation.key === translation.key) {
                                translation.value = translatedTranslation.value;
                                translation._id = translatedTranslation._id;
                                return true;
                            }
                            return false;
                        });
                    });
                }
                _.each(results.allTranslations, function (translation) {
                    translations.push({
                        _id: translation._id,
                        key: translation.key,
                        value: translation.value
                    });
                });

            }
            res.set("Content-Type", express.mime.types.json);
            res.end(JSON.stringify({
                locale: req.param('locale'),
                path: req.param('path'),
                translations: translations
            }));
        });
    });
}

TranslateMe.prototype.createTranslationServiceRoutes = function(app) {
    var self = this;

    // TODO send all translations by locale if locale is omitted
    // TODO introduce parameter to control output format. E.g. json, requirejs
    app.get('/i18n/translations/:locale?', function(req, res) {
        var requestedLocale = req.param('locale');

        if (!requestedLocale) {
            requestedLocale = locale.Locale['default'].toString();
        } else {
            requestedLocale = new locale.Locales(requestedLocale).best(self.supportedLocales).toString();
        }

        TranslationModel.find({locale: requestedLocale}, "key value path", function (err, docs) {
            var result = {};
            _.each(docs, function (translation) {
                if (!_.isObject(result[translation.path])) {
                    result[translation.path] = {};
                }
                result[translation.path][translation.key] = translation.value;
            });

            res.set('Content-Type', express.mime.types.js);
            res.end('define(' + JSON.stringify(result) + ');');
        });
    });

    app.get('/i18n/locales', function(req, res) {
        var locales = [];
        locales.push(locale.Locale['default'].toString());
        _.each(self.supportedLocales, function(locale) {
            locales.push(locale.toString());
        })
        res.set('Content-Type', express.mime.types.json);
        res.end(JSON.stringify(locales));
    });

    app.get('/i18n/namespaces', function(req, res) {
        TranslationModel.distinct('path').exec(function (err, docs) {
            res.set('Content-Type', express.mime.types.json);
            res.end(JSON.stringify(docs));
        });
    });
}

module.exports = TranslateMe;
