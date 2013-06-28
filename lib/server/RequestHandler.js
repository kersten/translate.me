var _ = require('underscore')._,
    l = require('locale'),
    express = require('express'),
    mongoose = require('mongoose'),
    util = require('util'),
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
}

RequestHandler.prototype.getTranslations = function(req, res) {
    var params = {
            select: req.param('select'),
            query: req.param('q'),
            onlyEmpty: req.param('onlyEmpty'),
            namespace: req.param('namespace')
        },
        query = TranslationModel.find();

    if(params.select) {
        query.select(_.flatten([params.select]).join(' '));
    }
    if(params.query) {
        query.or([
            {'key': new RegExp(params.query, 'i')},
            {'translations.value': new RegExp(params.query, 'i')}
        ]);
    }
    if(params.onlyEmpty == 'true') {
        query.where('translations').size(0);
    }
    if(params.namespace) {
        query.in('namespace', _.flatten([params.namespace]));
    }

    query.lean();
    query.exec(function(err, masterTranslations) {
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

RequestHandler.prototype.updateTranslation = function(req, res) {
    var params = { _id: req.param('_id') },
        translation = req.body;

    if(params._id === undefined) {
        res.send(400, "Sorry. The resource (_id) is missing.");
        return;
    }
    if(translation === undefined) {
        res.send(400, "Sorry. The body of your put request is empty. You must pass the translation.");
        return;
    }

    TranslationModel.findById(params._id, function(err, model) {
        if(err) {
            res.send(500, "Sorry. An error occurred while retrieving the translation. Here's the error: " + JSON.stringify(err));
        } else if(!model) {
            res.send(500, util.format('Sorry. Couldn\'t find translation with _id: "%s".', params._id));
        } else {
            model.updateTranslation(translation, function(err, updatedModel) {
                if(!err && updatedModel) {
                    res.send(updatedModel.toJSON());
                } else {
                    res.send(500, "Sorry. An error occurred: " + err.message);
                }
            });
        }
    });
};

RequestHandler.prototype.createTranslation = function(req, res) {
    var translation = {
        namespace: req.param('namespace'),
        key: req.param('key')
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
