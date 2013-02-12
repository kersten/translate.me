var async = require("async"),
    mongoose = require("mongoose"),
    url = require('url'),
    _ = require("underscore")._;

require("./I18nSchema");

module.exports = function (options) {
    var parser = require("./parser"),
        ui = require("./ui"),
        I18n = mongoose.model("I18n"),
        I18nStrings = mongoose.model("I18nString"),
        translationPathRegexp = /^\/nls(?:\/([a-z]{0,2}))?\/translations$/;

    if (!options || !options.paths) {
        throw "No template path given";
        return;
    }

    if (!options.nativeLanguage) {
        options.nativeLanguage = "en"
    }

    mongoose.connect((options && options.mongoConnect) ? options.mongoConnect : "mongodb://localhost/i18n", function () {
        parser.parse(options);
    });

    function send (res, locale) {
        var json = {};

        _.each(locale, function (strings) {
            if (!_.isObject(json[strings.path])) {
                json[strings.path] = {};
            }

            json[strings.path][strings.key] = strings.value;
        });

        res.end("define({strings: " + JSON.stringify(json) + ", isTranslator: true});");
    };

    return function (req, res, next) {
        var pathName = url.parse(req.url).pathname,
            requestedLocale, m;

        if (!_.contains(['GET', 'PUT', 'POST', 'HEAD'], req.method.toUpperCase())) {
            return next();
        }

        if (options.enableUI && /^\/i18nAdmin/.test(pathName)) {
            return ui(req, res, options);
        }

        if ((m = translationPathRegexp.exec(pathName))) {
            requestedLocale = m[1];
            if (requestedLocale) {
                I18nStrings.find({locale: options.nativeLanguage}, "key value path", function (err, strings) {
                    if (!err && strings != null) {
                        I18nStrings.find({locale: requestedLocale}, "key value path", function (err, stringsLocale) {
                            _.each(strings, function (string, i) {
                                var exists = _.find(stringsLocale, function (localString) {
                                    return localString.key === string.key && localString.path === string.path;
                                });
                                if (exists) {
                                    strings[i] = exists;
                                }
                            });

                            res.set('Content-Type', 'application/javascript');
                            send(res, _.extend(strings));
                        });
                    }
                });
            }
        } else {
            return next();
        }
    }
};
