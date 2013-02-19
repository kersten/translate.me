var _ = require("underscore")._,
    async = require("async"),
    l = require("locale"),
    mongoose = require("mongoose"),
    TranslationModel = require("./I18nSchema"),
    parser = require("./parser"),
    express = require("express");

/**
 * Creates a new TranslateMe object.
 *
 * @param {String} mongoURL an URL of a mongo db to create the translations in
 * @param {String} defaultLocale a default country code, which language the translation statements represent
 * @param {String[]} supportedLocales a list of locales, which shall be supported by the system
 * @constructor
 */
TranslateMe = function (mongoURL, defaultLocale, supportedLocales) {
    if(!mongoURL) {
        throw "Please pass a mongo URL to connect to.";
    }
    if(!defaultLocale) {
        throw "Please pass a locale.";
    }
    if(!supportedLocales) {
        throw "Please pass at least one other locale which should be supported by the system.";
    }

    l.Locale['default'] = new l.Locale(defaultLocale);
    this.supportedLocales = new l.Locales(_.uniq(supportedLocales));

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
        parser.parse(directories, l.Locale['default'].toString(), callback);
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
    var self = this;

    if(enableAdminUI) {
        app.use('/i18n/admin', express.static(__dirname + "/../public"));
    }

    app.get('/i18n/require/translations', function(req, res) {
        var locale = req.param('locale');

        if (!locale) {
            locale = l.Locale['default'].toString();
        } else {
            // TODO Doesn't work properly. E.g. Returns for "de_CH": "en" if it's the default locale, however "de" is supported
            locale = new l.Locales(locale).best(self.supportedLocales).toString();
        }

        TranslationModel.find({locale: locale}, function (err, docs) {
            var result = {};
            _.each(docs, function (translation) {
                if (!result[translation.path]) {
                    result[translation.path] = {};
                }
                result[translation.path][translation.key] = translation.value;
            });

            res.set('Content-Type', express.mime.types.js);
            res.send('define(' + JSON.stringify(result) + ');');
        });
    });

    app.get('/i18n/translations/:id', function(req, res) {
        var id = req.param('id');
        TranslationModel.findById(id).exec(function(err, doc) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(doc));
            } else {
                res.send(404, "Sorry. Couldn't find any translation with the id: \"" + id + "\".")
            }
        })
    });

    // Get translations
    app.get('/i18n/translations', function(req, res) {
        var locale = req.param('locale'),
            path = req.param('path');

        async.parallel({
            allTranslations: function(callback) {
                var query = TranslationModel.find();
                query.select('_id key path locale value');
                query.where('locale').equals(l.Locale['default'].toString());
                if(_.isString(path)) {
                    query.where('path').equals(path);
                }
                query.exec(callback);
            },
            requestedTranslations: function(callback) {
                var query;
                if(locale && l.Locale['default'].toString() !== locale) {
                    query = TranslationModel.find();
                    query.select('_id key path locale value');
                    query.where('locale').equals(locale);
                    if(_.isString(path)) {
                        query.where('path').equals(path);
                    }
                    query.exec(callback);
                } else {
                    callback(null);
                }
            }
        }, function(err, results) {
            if(!err) {
                var translations = [];
                if(results.requestedTranslations) {
                    _.each(results.allTranslations, function(defaultTranslation) {
                        var translation = _.find(results.requestedTranslations, function(translation) {
                            return translation.key === defaultTranslation.key;
                        });
                        if(translation) { // Has been translated. Use.
                            translations.push(translation);
                        } else { // Generate new shallow translation with requested locale
                            translations.push({
                                key: defaultTranslation.key,
                                path: defaultTranslation.path,
                                locale: locale
                            });
                        }
                    });
                }

                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(translations));
            } else {
                res.send(500, "Sorry. Couldn't retrieve the translations. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Create new translation
    app.post('/i18n/translations', function(req, res) {
        var translation = new TranslationModel({
            locale: req.param('locale'),
            path: req.param('path'),
            key: req.param('key'),
            value: req.param('value')
        });

        translation.save(function(err, model) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(model));
            } else {
                res.send(500, "Sorry. Couldn't create the translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Update existing translation
    app.put('/i18n/translations/:id', function(req, res) {
        TranslationModel.findByIdAndUpdate(req.param('id'), {value: req.body.value}, {new: true}, function(err, doc) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(doc));
            } else {
                res.send(500, "Sorry. Couldn't update the translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get('/i18n/locales', function(req, res) {
        var locales = [];
        locales.push(l.Locale['default'].toString());
        _.each(self.supportedLocales, function(locale) {
            locales.push(locale.toString());
        })
        res.set('Content-Type', express.mime.types.json);
        res.send(JSON.stringify(locales));
    });

    app.get('/i18n/namespaces', function(req, res) {
        TranslationModel.distinct('path').exec(function (err, docs) {
            if(!err) {
                res.set('Content-Type', express.mime.types.json);
                res.send(JSON.stringify(docs));
            } else {
                res.status(500, "Sorry. Couldn't update the namespaces. Here's the error: " + JSON.stringify(err));
            }
        });
    });
}

module.exports = TranslateMe;
