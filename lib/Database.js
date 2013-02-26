var _ = require("underscore")._,
    async = require("async"),
    l = require("locale"),
    mongoose = require("mongoose"),
    TranslationModel = require("./TranslationModel");

Database = function(mongoURL) {
    if(mongoURL) {
        mongoose.connect(mongoURL);
    }
}

Database.prototype.getTranslationById = function(id, callback) {
    TranslationModel.findById(id).exec(callback);
}

Database.prototype.getTranslations = function(conditions, defaultLocale, callback) {
    var locale = conditions.locale,
        path = conditions.path;

    async.parallel({
        allTranslations: function(callback) {
            var query = TranslationModel.find();
            query.select('_id key path locale value');
            query.where('locale').equals(defaultLocale);
            if(_.isString(path)) {
                query.where('path').equals(path);
            }
            query.exec(callback);
        },
        requestedTranslations: function(callback) {
            var query;
            if(!_.isEqual(locale, [defaultLocale])) {
                query = TranslationModel.find();
                query.select('_id key path locale value');
                query.in('locale', locale);
                if(_.isString(path)) {
                    query.where('path').equals(path);
                }
                query.exec(callback);
            } else {
                callback(null);
            }
        }
    }, function(err, results) {
        if(!err) {
            var translations = [];
            if(results.requestedTranslations) {
                _.each(results.allTranslations, function(defaultTranslation) {
                    var translated = _.filter(results.requestedTranslations, function(translation) {
                        return translation.key === defaultTranslation.key
                            && translation.path === defaultTranslation.path;
                    });

                    if(_.isArray(locale)) {
                        _.each(locale, function(locale) {
                            var translation;
                            if((translation = _.find(translated, function(t) { return t.locale === locale.toString(); }))) {
                                translations.push(translation);
                            } else {
                                translations.push({
                                    key: defaultTranslation.key,
                                    path: defaultTranslation.path,
                                    locale: locale.toString()
                                });
                            }
                        });
                    }
                });
            } else {
                translations = results.allTranslations;
            }
            callback(null, translations);
        } else {
            callback(err);
        }
    });
}

Database.prototype.createOrUpdateTranslation = function(translation, callback) {
    var condition = _.pick(translation, 'locale', 'path', 'key');
    TranslationModel.findOneAndUpdate(condition, translation, {new: true, upsert: true}, callback);
}

Database.prototype.updateTranslationById = function(id, translation, callback) {
    TranslationModel.findByIdAndUpdate(id, translation, {new: true}, callback);
}

Database.prototype.getNamespaces = function(callback) {
    TranslationModel.distinct('path').exec(callback);
}

Database.prototype.getStats = function(callback) {
    TranslationModel.collection.group({
        'locale':true
    }, null, {
        numberofTranslations: 0,
        translated: 0
    }, function(doc, prev) {
        prev.numberofTranslations++;
        if(doc.value) {
            prev.translated++;
        }
    }, null, true, callback);
}

module.exports = Database;
