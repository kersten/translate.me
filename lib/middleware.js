var async = require("async"),
    mongoose = require("mongoose"),
    url = require('url'),
    _ = require("underscore")._;

require("./I18nSchema");

module.exports = function (options) {
    var regex = {
            ui: /^\/i18nAdmin/,
            handle: (options && options.nlsPath !== undefined)
                ? new RegExp("^\/" + options.nlsPath.replace(/^\/|\/$/g, '').replace(/\//g, '\\/') + "\/.*$")
                : /^\/nls\/.*$/
        },
        parser = require("./parser"),
        ui = require("./ui"),
        I18n = mongoose.model("I18n"),
        I18nStrings = mongoose.model("I18nString");

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
            locale = "";

        if ('GET' != req.method.toUpperCase() && 'PUT' != req.method.toUpperCase() && 'POST' != req.method.toUpperCase() && 'HEAD' != req.method.toUpperCase()) {
            return next();
        }

        if (options.enableUI && options.enableUI === true && regex.ui.test(pathName)) {
            return ui(req, res, options);
        }

        if (regex.handle.test(pathName)) {
            res.set('Content-Type', 'application/javascript');

            if (req.session && req.session.userObj) {
                locale = req.session.userObj.settings.language;
            }

            if (locale !== "") {
                I18nStrings.find({locale: process.env.LOCALE}, "key value path", function (err, strings) {
                    if (!err && strings != null) {
                        I18nStrings.find({locale: locale}, "key value path", function (err, stringsLocale) {
                            console.log(stringsLocale);
                            send(res, _.extend(strings, stringsLocale || {}));
                        });
                    }
                });
            } else {
                I18nStrings.find({locale: process.env.LOCALE}, "key value path", function (err, strings) {
                    if (!err && strings != null) {
                        send(res, strings);
                    }
                });
            }
        } else {
            console.log("Path not found in RegEx");

            return next();
        }
    }
};
