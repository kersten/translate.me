var mongoose = require("mongoose"),
    _ = require("underscore")._,
    I18nStrings = require("./I18nSchema");

module.exports = function(defaultLocale) {
    console.log("nls.middleware loaded", defaultLocale);
    var translationPathIdentifier = /^(?:\/([a-z]{0,2}))?\/translations$/;

    return function(req, res, next) {
        var requestedLocale, m;

        if ('GET' === req.method.toUpperCase() && (m = translationPathIdentifier.exec(req.url))) {
            requestedLocale = m[1];
            if (!requestedLocale) {
                requestedLocale = defaultLocale;
            }

            I18nStrings.find({locale: requestedLocale}, "key value path", function (err, translations) {
                res.set('Content-Type', 'application/javascript');
                res.end(createResponseBody(translations));
            });
            return;
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
}
