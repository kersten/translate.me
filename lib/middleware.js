var async = require("async"),
    mongoose = require("mongoose"),
    _ = require("underscore")._;

require("./I18nSchema");

module.exports = function (options) {
    var parser = require("./parser"),
        ui = require("./ui"),
        I18nStrings = mongoose.model("I18nString"),
        translationPathIdentifier = /^\/nls(?:\/([a-z]{0,2}))?\/translations$/,
        adminUIPathIdentifier = /^\/i18nAdmin/;

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

    return function(req, res, next) {
        var requestedLocale, m;

        if (_.contains(['GET', 'PUT', 'POST', 'HEAD'], req.method.toUpperCase())) {
            if (options.enableUI && adminUIPathIdentifier.test(req.url)) {
                ui(req, res, options);
                return;
            }
            if ((m = translationPathIdentifier.exec(req.url))) {
                requestedLocale = m[1];
                if (!requestedLocale) {
                    requestedLocale = options.nativeLanguage;
                }

                I18nStrings.find({locale: requestedLocale}, "key value path", function (err, translations) {
                    res.set('Content-Type', 'application/javascript');
                    res.end(createResponseBody(translations));
                });
                return;
            }
        }
        next();
    }

    function createResponseBody(translations) {
        var result = {};

        _.each(translations, function (translation) {
            if (!_.isObject(result[translation.path])) {
                result[translation.path] = {};
            }
            result[translation.path][translation.key] = translation.value;
        });

        return "define({strings: " + JSON.stringify(result) + ", isTranslator: true});";
    };
};
