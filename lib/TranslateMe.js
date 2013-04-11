var _ = require("underscore")._,
    l = require("locale"),
    express = require("express"),
    Parser = require("./translations-parser/Parser"),
    MongoTranslationStore = require('./MongoTranslationStore'),
    root = "/translate.me", apiRoot = root + "/api/:format";

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
    this.parser = new Parser(this.translationStore);
};

TranslateMe.prototype.bestLocale = function (acceptLanguage) {
    var locales = new l.Locales(acceptLanguage);
    return locales.best(this.supportedLocales).language;
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
    if(!directories) {
        throw "Please pass a directory or list of directories to check for translation statements.";
    }
    this.parser.parse(directories, l.Locale['default'].toString(), callback);
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
    var self = this,
        masterLocale = l.Locale['default'].toString();

    if(enableAdminUI) {
        app.use(root + '/admin', express.static(__dirname + "/../public"));
    }
    app.use(root, express.static(__dirname + "/browser"));
    app.use(l(this.supportedLocales));

    app.all(apiRoot + "/*", function(req, res, next) {
        res.header('Cache-Control', 'no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0');
        switch(req.param('format')) {
            case 'require':
                res.sendData = function(object) {
                    res.type(express.mime.types.js).end("define(function() {return " + JSON.stringify(object) + "});");
                };
                break;

            case 'json':
                res.sendData = function(object) {
                    res.type(express.mime.types.json).end(JSON.stringify(object));
                };
                break;

            case 'script':
                var variable = (req.param(0) === 'translations') ? 'translateMeTranslations' : 'translateMeStats';

                res.sendData = function (object) {
                    res.type(express.mime.types.js).end('var ' + variable + ' = ' + JSON.stringify(object) + ';');
                };
                break;

            default:
                res.send(500, "Sorry. Couldn't do anything. Output format: \"" + req.param('format') + "\" is unknown.");
                return;
                break;
        }

        next();
    });

    app.get(apiRoot + '/translations/:id', function(req, res) {
        self.translationStore.getTranslationById(req.param('id'), function(err, translation) {
            if(!err) {
                res.sendData(translation);
            } else {
                res.send(404, "Sorry. Couldn't find any translation with the id: \"" + id + "\".");
            }
        });
    });

    // Get translations
    app.get(apiRoot + '/translations', function(req, res) {
        var locales = req.param('locale'),
            namespaces = req.param('namespace'),
            emulateMissingTranslations = req.param('emulateMissingTranslations'),
            conditions = {
                namespace: namespaces,
                locale: locales
            };

        if(emulateMissingTranslations) {
            delete(conditions.locale);
        }

        self.translationStore.getTranslations(conditions,
            function(err, translations) {
                if(!err) {
                    if(emulateMissingTranslations) {
                        translations = emulateTranslation(translations, locales, masterLocale, self.supportedLocales);
                    }
                    res.sendData(translations);
                } else {
                    res.send(500, "Sorry. Couldn't retrieve the translations. Here's the error: " + JSON.stringify(err));
                }
            }
        );
    });

    // Create or update translation
    app.post(apiRoot + '/translations', function(req, res) {
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
            translation.locale = masterLocale;
        }
        if(req.param('value')) {
            translation.value = req.param('value');
        }
        if(req.param('origin')) {
            translation.origin = req.param('origin');
        } else {
            translation.origin = 'dynamic';
        }

        self.translationStore.createOrUpdateTranslation(translation, function(err, newTranslation) {
            if(!err) {
                res.sendData(newTranslation);
            } else {
                res.send(500, "Sorry. Couldn't create translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    // Update existing translation
    app.put(apiRoot + '/translations/:id', function(req, res) {
        self.translationStore.updateTranslationById(req.param('id'), {value: req.body.value},  function(err, updatedTranslation) {
            if(!err) {
                res.sendData(updatedTranslation);
            } else {
                res.send(500, "Sorry. Couldn't update the translation. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(apiRoot + '/locales', function(req, res) {
        var locales = [];
        _.each(self.supportedLocales, function(locale) {
            locales.push(locale.toString());
        })
        res.sendData(locales);
    });

    app.get(apiRoot + '/namespaces', function(req, res) {
        self.translationStore.getNamespaces(function (err, namespaces) {
            if(!err) {
                res.sendData(namespaces);
            } else {
                res.send(500, "Sorry. Couldn't retrieve namespaces. Here's the error: " + JSON.stringify(err));
            }
        });
    });

    app.get(apiRoot + "/stats", function(req, res) {
        self.translationStore.getStats(function(err, stats) {
            var result;
            if(!err) {
                result = {};
                result.masterLocale = masterLocale;
                result.numberOfTranslations = _.find(stats, function(stat) { return stat.locale === result.masterLocale }).numberOfTranslations;
                result.translatedLocales = {};
                _.each(stats, function(stat) {
                    var translatedInPercent = stat.numberOfTranslationsWithValue / result.numberOfTranslations;
                    if(stat.locale === result.masterLocale) {
                        translatedInPercent = 1;
                    }
                    result.translatedLocales[stat.locale] = {
                        translatedInPercent: translatedInPercent
                    };
                });
                res.sendData(result);
            } else {
                res.send(500, "Sorry. Couldn't create stats. Here's the error: " + JSON.stringify(err));
            }
        });
    });
}

function emulateTranslation(translations, locales, masterLocale, supportedLocales) {
    var emulatedTranslations = [],
        masterTranslations = _.where(translations, {locale: masterLocale});

    if(!locales) {
        locales = [];
        _.each(supportedLocales, function(supportedLocale) {
            locales.push(supportedLocale.toString());
        });
    } else if(_.isString(locales)) {
        locales = [locales];
    }

    _.each(locales, function(locale) {
        _.each(masterTranslations, function(mt) {
            var translation = _.find(translations, function(t) {
                return locale === t.locale && t.namespace === mt.namespace && t.key === mt.key;
            });
            if(!translation) {
                translation = {
                    key: mt.key,
                    namespace: mt.namespace,
                    locale: locale,
                    origin: mt.origin
                };
            }
            emulatedTranslations.push(translation);
        });
    });

    return emulatedTranslations;
}

module.exports = TranslateMe;
