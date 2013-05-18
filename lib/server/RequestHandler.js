var _ = require('underscore')._,
    l = require('locale'),
    express = require('express'),
    mongoose = require('mongoose'),
    TranslationModel = mongoose.model("translation", require('./TranslationSchema'));

function RequestHandler(supportedLocales) {

    this.stats = function(req, res) {
        TranslationModel.find().lean().exec(function(err, translationModels) {
            var result, statsByLocale;

            if(!err && translationModels) {
                statsByLocale = {};
                _.each(supportedLocales, function(locale) {
                    statsByLocale[locale] = {
                        numberOfTranslations: 0
                    };
                });
                _.each(translationModels, function(translationModel) {
                    _.each(translationModel.translations, function(t) {
                        statsByLocale[t.locale].numberOfTranslations += 1;
                    });
                });
                statsByLocale[l.Locale['default'].toString()].numberOfTranslations = translationModels.length;

                result = {};
                result.masterLocale = l.Locale['default'].toString();
                result.numberOfTranslations = translationModels.length;
                result.translatedLocales = statsByLocale;

                res.type(express.mime.types.json);
                res.end(JSON.stringify(result));
            } else {
                res.send(500, "Sorry. Couldn't create stats. Here's the error: " + JSON.stringify(err));
            }
        });
    };

    this.getLocales = function(req, res) {
        var locales = [];
        _.each(supportedLocales, function(locale) {
            locales.push(locale);
        });
        res.type(express.mime.types.json);
        res.end(JSON.stringify(locales));
    };

    this.getTranslationsLegacy = function(req, res) {
        var locales = req.param('locale') ? _.flatten([req.param('locale')]) : supportedLocales,
            namespaces = req.param('namespace'),
            emulateMissingTranslations = req.param('emulateMissingTranslations'),
            query = TranslationModel.find();

        if(namespaces !== undefined && !_.isEmpty(namespaces)) {
            query.where('namespace', namespaces);
        }
        query.lean();
        query.exec(function(err, models) {
            var translations;
            if(!err && models) {
                translations = [];
                _.each(models, function(model) {
                    _.each(TranslationModel.toOldModel(model, locales, emulateMissingTranslations), function(oldModel) {
                        translations.push(oldModel);
                    });
                });
                res.type(express.mime.types.json);
                res.end(JSON.stringify(translations));
            } else {
                res.send(500, "Sorry. Couldn't retrieve the translations. Here's the error: " + JSON.stringify(err));
            }
        });
    };

    this.searchTranslations = function (req, res) {
        var query = TranslationModel.find({
            $or: [{
                key: new RegExp(req.param('q'), 'i')
            }, {
                translations: {
                    $elemMatch: {
                        locale: req.param('locale'),
                        value: new RegExp(req.param('q'), 'i')
                    }
                }
            }]
        }).lean();

        if (req.param('namespace')) {
            query.where('namespace', req.param('namespace'));
        }

        query.exec(function (err, models) {
            var translations = [],
                locales = req.param('locale') ? _.flatten([req.param('locale')]) : supportedLocales;

            if (err) {
                res.status(500);
                res.send(err);

                return;
            }

            _.each(models, function(model) {
                _.each(TranslationModel.toOldModel(model, locales, true), function(oldModel) {
                    translations.push(oldModel);
                });
            });

            res.send(translations);
        });
    };
}

RequestHandler.prototype.getTranslations = function(req, res) {
    TranslationModel.find().select('-_id key namespace translations.locale translations.value').lean().exec(function(err, masterTranslations) {
        var result;
        if(!err && masterTranslations) {
            result = [];
            _.each(masterTranslations, function(masterTranslation) {
                result.push(masterTranslation);
            });
            res.type(express.mime.types.json);
            res.end(JSON.stringify(result));
        } else {
            res.send(500, "Sorry. Couldn't retrieve masters. Here's the error: " + JSON.stringify(err));
        }
    });
};

RequestHandler.prototype.createTranslation = function(req, res) {
    var translation = {
        namespace: req.param('namespace'),
        key: req.param('key'),
        sources: ['dynamic']
    };

    if(translation.namespace === undefined) {
        res.send(400, "Sorry. Couldn't create translation. Parameter 'namespace' is missing.");
        return;
    }
    if(translation.key === undefined || translation.key.length <= 0) {
        res.send(400, "Sorry. Couldn't create translation. Parameter 'key' is missing or empty.");
        return;
    }

    TranslationModel.getTranslationModel(translation, function(err, model) {
        if(!err && model) {
            if(!model.isStatic()) {
                model.save(function(err, model) {
                    if(!err && model) {
                        res.type(express.mime.types.json);
                        res.end(JSON.stringify(model));
                    } else {
                        res.send(500, "Sorry. Couldn't create translation. Here's the error: " + JSON.stringify(err));
                    }
                });
            } else {
                res.type(express.mime.types.json);
                res.end(JSON.stringify(model));
            }
        } else {
            res.send(500, "Sorry. Couldn't create translation. Here's the error: " + JSON.stringify(err));
        }
    });
};

RequestHandler.prototype.updateTranslationsLegacy = function(req, res) {
    var translation = req.body;

    TranslationModel.findById(translation._id,function(err, translationModel) {
        if(!err && translationModel) {
            translationModel.translate(translation.locale, translation.value);
            translationModel.save(function(err, updatedModel) {
                if(!err && updatedModel) {
                    res.type(express.mime.types.json);
                    res.end(JSON.stringify(TranslationModel.toOldModel(updatedModel, translation.locale)));
                } else {
                    res.send(500, "Sorry. Couldn't update the translation. Here's the error: " + JSON.stringify(err));
                }
            });
        } else {
            res.send(500, "Sorry. Couldn't update the translation. Here's the error: " + JSON.stringify(err));
        }
    });
};

RequestHandler.prototype.getNamespaces = function(req, res) {
    TranslationModel.distinct('namespace').exec(function (err, namespaces) {
        if(!err && namespaces) {
            res.type(express.mime.types.json);
            res.end(JSON.stringify(namespaces));
        } else {
            res.send(500, "Sorry. Couldn't retrieve namespaces. Here's the error: " + JSON.stringify(err));
        }
    });
};

module.exports = RequestHandler;
