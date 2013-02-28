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
        namespace = conditions.namespace;

    async.parallel({
        allTranslations: function(callback) {
            var query = TranslationModel.find();
            query.select('_id key namespace locale value');
            query.where('locale').equals(defaultLocale);
            if(_.isString(namespace)) {
                query.where('namespace').equals(namespace);
            }
            query.exec(callback);
        },
        requestedTranslations: function(callback) {
            var query;
            if(!_.isEqual(locale, [defaultLocale])) {
                query = TranslationModel.find();
                query.select('_id key namespace locale value');
                query.in('locale', locale);
                if(_.isString(namespace)) {
                    query.where('namespace').equals(namespace);
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
                            && translation.namespace === defaultTranslation.namespace;
                    });

                    if(_.isArray(locale)) {
                        _.each(locale, function(locale) {
                            var translation;
                            if((translation = _.find(translated, function(t) { return t.locale === locale.toString(); }))) {
                                translations.push(translation);
                            } else {
                                translations.push({
                                    key: defaultTranslation.key,
                                    namespace: defaultTranslation.namespace,
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
    var condition = _.pick(translation, 'locale', 'namespace', 'key');
    TranslationModel.findOneAndUpdate(condition, translation, {new: true, upsert: true}, callback);
}

Database.prototype.updateTranslationById = function(id, translation, callback) {
    TranslationModel.findByIdAndUpdate(id, translation, {new: true}, callback);
}

Database.prototype.getNamespaces = function(callback) {
    TranslationModel.distinct('namespace').exec(callback);
}

Database.prototype.getStats = function(callback) {
    TranslationModel.collection.group({
        'locale':true
    }, null, {
        numberOfTranslations: 0,
        numberOfTranslationsWithValue: 0
    }, function(doc, prev) {
        prev.numberOfTranslations++;
        if(doc.value) {
            prev.numberOfTranslationsWithValue++;
        }
    }, null, true, callback);
}

module.exports = Database;
