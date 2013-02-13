(function () {
    "use strict";

    var fs = require("fs"),
        mongoose = require("mongoose"),
        url = require("url"),
        _ = require("underscore")._;

    function UI (req, res, options) {
        var URL = url.parse(req.url),
            i18nString = mongoose.model("I18nString"),
            template;

        if (/^\/i18nAdmin\/strings/.test(URL.pathname)) {
            res.set("Content-Type", "application/json");

            // UPDATE
            if (req.method.toUpperCase() == "PUT") {
                var params = req.body;

                i18nString.findById(params._id, function (err, doc) {
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
                        return res.send(response);
                    });
                });

                return;
            }

            // CREATE
            if (req.method.toUpperCase() == "POST") {
                var params = req.body,
                    string = new i18nString();

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
                    return res.send(response);
                });
                return;
            }

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
                    res.send(JSON.stringify({
                        locale: countryCode,
                        path: path,
                        translations: translations
                    }));
                }
            i18nString.find({path: path, locale: options.nativeLanguage}).exec(function (err, listOfAllTranslations) {
                if(countryCode !== options.nativeLanguage) {
                    i18nString.find({path: path, locale: countryCode}).exec(function(err, listOfTranslatedTranslations) {
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

            return;
        } else if (/^\/i18nAdmin\/paths/.test(URL.pathname)) {
            // JS File
            res.set("Content-Type", "application/json");

            i18nString.distinct("path").exec(function (err, docs) {
                var paths = [];
                _.each(docs, function(doc) {
                    paths.push({
                        path: doc
                    });
                });
                res.send(JSON.stringify(paths));
            });

            return;
        } else if (/^\/i18nAdmin\/cclist/.test(URL.pathname)) {
            var languages = require("./countries.iso_3166-1");
            languages = _.reject(languages, function(language) {
                return language.code === options.nativeLanguage
            });
            res.set("Content-Type", "application/json");
            res.send(JSON.stringify(languages));
            return;
        } else if (/^\/i18nAdmin\/css/.test(URL.pathname)) {
            // CSS File
            res.set("Content-Type", "text/css");
            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else if (/^\/i18nAdmin\/js/.test(URL.pathname)) {
            // JS File
            res.set("Content-Type", "application/javascript");
            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else {
            // Frontend
            template = fs.readFileSync(__dirname + "/../templates/index.mustache").toString();
        }
        res.send(template);
    }

    module.exports = UI;
}());
