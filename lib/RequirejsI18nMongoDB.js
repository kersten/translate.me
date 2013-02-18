var mongoose = require("mongoose"),
    _ = require("underscore")._;
    I18nStrings = require("./I18nSchema"),
    parser = require("./parser"),
    express = require("express");

/**
 * Creates a new RequirejsI18nMongoDB object.
 *
 * @param {String} mongoURL an URL of a mongo db to create the translations in
 * @param {String} defaultLocale a default country code which language the translations statements represent
 * @param {String[]} supportedLocales a list of locales, which shall be supported by the system
 * @constructor
 */
RequirejsI18nMongoDB = function (mongoURL, defaultLocale, supportedLocales) {
    if(!mongoURL) {
        throw "Please pass a mongo URL to connect to.";
    }
    if(!defaultLocale) {
        throw "Please pass a locale.";
    }
    if(!supportedLocales) {
        throw "Please pass at least one othe locale which should be supported by the system.";
    }
    
    this.defaultLocale = defaultLocale;
    this.supportedLocales = _.uniq(supportedLocales);
    if(!_.contains(this.supportedLocales, defaultLocale)) {
        this.supportedLocales.push(defaultLocale);
    }

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
RequirejsI18nMongoDB.prototype.generateDefaultTranslations = function(directories, callback) {
    if(!directories) {
        throw "Please pass a directory or list of directories to check for translation statements.";
    }
    var self = this;
    I18nStrings.ensureIndexes(function() {
        parser.parse(directories, self.defaultLocale, callback);
    });
}

/**
 * Registers the translation ui to the passed express app.
 *
 * @param app express app to register the translation ui to
 */
RequirejsI18nMongoDB.prototype.registerTranslationUI = function(app) {
    if(!app) {
        throw "Please pass an express app object.";
    }
    if(!root) {
        throw "Please pass a path where the ui should reside in.";
    }
    var self = this;

    app.use('/i18n/admin', express.static(__dirname + "/../public"));
    app.put('/i18n/admin/translations', function(req, res) {
        var params = req.body;

        I18nStrings.findById(params._id, function (err, doc) {
            if (!doc) {
                res.send(JSON.stringify([]));
                return;
            }

            doc.set({
                value: params.value
            });

            doc.save(function (err, model) {
                var response = "";
                if(!err) {
                    response = JSON.stringify(model);
                }
                res.set("Content-Type", "application/json");
                res.send(response);
            });
        });
    });
    app.post('/i18n/admin/translations', function(req, res) {
        var params = req.body,
            string = new I18nStrings();

        string.set({
            locale: params.locale,
            path: params.path,
            key: params.key,
            value: params.value
        });
        string.save(function(err, model) {
            var response = "";
            if(!err) {
                response = JSON.stringify(model);
            }
            res.set("Content-Type", "application/json");
            res.send(response);
        });
    });
    app.get('/i18n/admin/translations', function(req, res) {
        var path = req.query["path"],
            countryCode = req.query["locale"],
            respond = function(res, countryCode, path, docs) {
                var translations = [];
                _.each(docs, function (doc) {
                    translations.push({
                        _id: doc._id,
                        key: doc.key,
                        value: doc.value
                    });
                });
                res.set("Content-Type", "application/json");
                res.send(JSON.stringify({
                    locale: countryCode,
                    path: path,
                    translations: translations
                }));
            };

        I18nStrings.find({path: path, locale: self.defaultLocale}).exec(function (err, listOfAllTranslations) {
            if(countryCode !== self.defaultLocale) {
                I18nStrings.find({path: path, locale: countryCode}).exec(function(err, listOfTranslatedTranslations) {
                    _.each(listOfAllTranslations, function(translation) {
                        translation._id = null;
                        translation.value = null;
                        _.find(listOfTranslatedTranslations, function(translatedTranslation) {
                            if(translatedTranslation.key === translation.key) {
                                translation.value = translatedTranslation.value;
                                translation._id = translatedTranslation._id;
                                return true;
                            }
                            return false;
                        });
                    });
                    respond(res, countryCode, path, listOfAllTranslations);
                })
            } else {
                respond(res, countryCode, path, listOfAllTranslations);
            }
        });
    });
}

/**
 * Registers the translation services to the passed express app.
 *
 * @param app express app to register the translation service to
 */
RequirejsI18nMongoDB.prototype.registerTranslationService = function(app) {
    if(!app) {
        throw "Please pass an express app object.";
    }
    var self = this;

    app.get('/i18n/translations/:locale?', function(req, res) {
        // TODO send translations by locale if locale is omitted
        var requestedLocale = req.param('locale');

        if (!requestedLocale) {
            requestedLocale = self.defaultLocale;
        }

        I18nStrings.find({locale: requestedLocale}, "key value path", function (err, docs) {
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
        res.set('Content-Type', express.mime.types.json);
        res.end(JSON.stringify(self.supportedLocales));
    });
    app.get('/i18n/namespaces', function(req, res) {
        I18nStrings.distinct('path').exec(function (err, docs) {
            res.set('Content-Type', express.mime.types.json);
            res.end(JSON.stringify(docs));
        });
    });
}

module.exports = RequirejsI18nMongoDB;
