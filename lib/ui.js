var I18nModel = require("./I18nSchema"),
    _ = require("underscore")._;

module.exports = function createUIServices(app, root, defaultLocale) {
    app.put(root + "/strings", function(req, res) {
        var params = req.body;

        I18nModel.findById(params._id, function (err, doc) {
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

    app.post(root + "/strings", function(req, res) {
        var params = req.body,
            string = new I18nModel();

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

    app.get(root + "/strings", function(req, res) {
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
            }
        I18nModel.find({path: path, locale: defaultLocale}).exec(function (err, listOfAllTranslations) {
            if(countryCode !== defaultLocale) {
                I18nModel.find({path: path, locale: countryCode}).exec(function(err, listOfTranslatedTranslations) {
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
