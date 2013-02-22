var _ = require("underscore")._,
    l = require("locale"),
    TranslationModel = require("./I18nSchema"),
    parser = require("./parser"),
    express = require("express"),
    Database = require('./Database');

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
    supportedLocales.push(defaultLocale);
    this.supportedLocales = new l.Locales(_.uniq(supportedLocales));

    this.database = new Database(mongoURL);
};

/**
 * Retrieves the current locale for a translation request. Overwrite this method to
 * use a different approach.
 *
 * By default it takes the accepeted language from the passed request object and
 * determines, based on the supported languages, which is best for the request.
 *
 * @param {express.Request} req an object which represents the request for the translation keys
 * @param {function} callback function(locale) a callback function which receives the locale for the request
 */
TranslateMe.prototype.getLocale = function(req, callback) {
    callback(new l.Locales(req.headers["accept-language"]).best(this.supportedLocales));
}

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

    app.use(l(this.supportedLocales));

    app.get('/i18n/require/translations', function(req, res) {
        self.getLocale.apply(null, [req, function (locale) {
            if (!locale) {
                locale = l.Locale['default'].toString();
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
        }]);
    });

    app.get('/i18n/translations/:id', function(req, res) {
        self.database.getTranslationById(req.param('id'), function(err, doc) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(doc));
            } else {
                res.send(404, "Sorry. Couldn't find any translation with the id: \"" + id + "\".")
            }
        });
    });

    // Get translations
    app.get('/i18n/translations', function(req, res) {
        var locale = req.param('locale'),
            path = req.param('path');

        if(!locale) {
            locale = [];
            _.each(self.supportedLocales, function(supportedLocale) {
                locale.push(supportedLocale.toString());
            });
        } else if(_.isString(locale)) {
            locale = [locale];
        }

        self.database.getTranslations({locale: locale, path: path}, l.Locale['default'].toString(),
            function(err, translations) {
                if(!err) {
                    res.set("Content-Type", express.mime.types.json);
                    res.send(JSON.stringify(translations));
                } else {
                    res.send(500, "Sorry. Couldn't retrieve the translations. Here's the error: " + JSON.stringify(err));
                }
            }
        );
    });

    // Create or update translation
    app.post('/i18n/translations', function(req, res) {
        var translation = {
                locale: req.param('locale'),
                path: req.param('path'),
                key: req.param('key'),
                value: req.param('value')
            };

        if(translation.path === undefined) {
            res.send(400, "Sorry. Couldn't create translation. Parameter 'path' is missing.");
            return;
        }
        if(!translation.key) {
            res.send(400, "Sorry. Couldn't create translation. Parameter 'key' is missing.");
            return;
        }
        if(!translation.locale) {
            translation.locale = l.Locale['default'].toString();
        }

        self.database.createOrUpdateTranslation(translation, function(err, model) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(model));
            } else {
                res.send(500, "Sorry. Couldn't create translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Update existing translation
    app.put('/i18n/translations/:id', function(req, res) {
        self.database.updateTranslationById(req.param('id'), {value: req.body.value},  function(err, doc) {
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
        _.each(self.supportedLocales, function(locale) {
            locales.push(locale.toString());
        })
        res.set('Content-Type', express.mime.types.json);
        res.send(JSON.stringify(locales));
    });

    app.get('/i18n/namespaces', function(req, res) {
        self.database.getNamespaces(function (err, docs) {
            if(!err) {
                res.set('Content-Type', express.mime.types.json);
                res.send(JSON.stringify(docs));
            } else {
                res.status(500, "Sorry. Couldn't update the namespaces. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get('/i18n/stats', function(req, res) {
        self.database.getStats( function(err, result) {
            if(!err) {
                res.set('Content-Type', express.mime.types.json);
                res.send(JSON.stringify(result));
            } else {
                res.status(500, "Sorry. Couldn't update the namespaces. Here's the error: " + JSON.stringify(err));
            }
        });
    });
}

module.exports = TranslateMe;
