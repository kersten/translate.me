var _ = require("underscore")._,
    l = require("locale"),
    parser = require("./translations-parser/Parser"),
    express = require("express"),
    MongoTranslationStore = require('./MongoTranslationStore')
    root = "/translate.me";

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
    this.translationStore = new MongoTranslationStore(mongoURL);
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
 * - .mustache: {{translation key="key" namespace="namespace"}}
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
    parser.parse(directories, l.Locale['default'].toString(), callback);
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
        app.use(root + '/admin', express.static(__dirname + "/../public"));
    }

    app.use(l(this.supportedLocales));

    app.get(root + '/require/translations', function(req, res) {
        var defaultLocale = l.Locale['default'].toString();
        self.getLocale.apply(null, [req, function (locale) {
            if (!locale) {
                locale = defaultLocale;
            }

            self.translationStore.getTranslations({
                locale: [defaultLocale, locale]
            }, defaultLocale, function(err, translations) {
                var groupedByLanguage = _.groupBy(translations, function(t) {return t.locale}),
                    defaultTranslations = groupedByLanguage[defaultLocale],
                    requestedTranslations = groupedByLanguage[locale],
                    result = {
                        allKeys: [],
                        requestedTranslations: {}
                    };

                _.each(defaultTranslations, function(t) {
                    result.allKeys.push(t.key);
                });

                _.each(requestedTranslations, function(t) {
                    if (!result.requestedTranslations[t.namespace]) {
                        result.requestedTranslations[t.namespace] = {};
                    }
                    result.requestedTranslations[t.namespace][t.key] = t.value;
                });

                res.set('Content-Type', express.mime.types.js);
                res.send('define(' + JSON.stringify(result) + ');');
            });
        }]);
    });

    app.get(root + '/translations/:id', function(req, res) {
        self.translationStore.getTranslationById(req.param('id'), function(err, doc) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(doc));
            } else {
                res.send(404, "Sorry. Couldn't find any translation with the id: \"" + id + "\".")
            }
        });
    });

    // Get translations
    app.get(root + '/translations', function(req, res) {
        var locale = req.param('locale'),
            namespace = req.param('namespace');

        if(!locale) {
            locale = [];
            _.each(self.supportedLocales, function(supportedLocale) {
                locale.push(supportedLocale.toString());
            });
        } else if(_.isString(locale)) {
            locale = [locale];
        }

        self.translationStore.getTranslations({locale: locale, namespace: namespace}, l.Locale['default'].toString(),
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
    app.post(root + '/translations', function(req, res) {
        var translation = {
                locale: req.param('locale'),
                namespace: req.param('namespace'),
                key: req.param('key')
            };

        if(translation.namespace === undefined) {
            res.send(400, "Sorry. Couldn't create translation. Parameter 'namespace' is missing.");
            return;
        }
        if(!translation.key) {
            res.send(400, "Sorry. Couldn't create translation. Parameter 'key' is missing.");
            return;
        }
        if(!translation.locale) {
            translation.locale = l.Locale['default'].toString();
        }
        if(req.param('value')) {
            translation.value = req.param('value');
        }

        self.translationStore.createOrUpdateTranslation(translation, function(err, model) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(model));
            } else {
                res.send(500, "Sorry. Couldn't create translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Update existing translation
    app.put(root + '/translations/:id', function(req, res) {
        self.translationStore.updateTranslationById(req.param('id'), {value: req.body.value},  function(err, doc) {
            if(!err) {
                res.set("Content-Type", express.mime.types.json);
                res.send(JSON.stringify(doc));
            } else {
                res.send(500, "Sorry. Couldn't update the translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(root + '/locales', function(req, res) {
        var locales = [];
        _.each(self.supportedLocales, function(locale) {
            locales.push(locale.toString());
        })
        res.set('Content-Type', express.mime.types.json);
        res.send(JSON.stringify(locales));
    });

    app.get(root + '/namespaces', function(req, res) {
        self.translationStore.getNamespaces(function (err, docs) {
            if(!err) {
                res.set('Content-Type', express.mime.types.json);
                res.send(JSON.stringify(docs));
            } else {
                res.status(500, "Sorry. Couldn't update the namespaces. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(root + '/stats', function(req, res) {
        self.translationStore.getStats( function(err, result) {
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
