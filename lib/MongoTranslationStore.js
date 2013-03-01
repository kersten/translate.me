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

Database.prototype.getTranslations = function(conditions, callback) {
    var query = TranslationModel.find(),
        locales = conditions.locale, // Array or String
        namespaces = conditions.namespace; // Array or String

    query.select('_id key namespace locale value');
    if(_.isString(locales)) {
        query.where('locale').equals(locales);
    } else if(_.isArray(locales)) {
        query.in('locale', locales);
    }
    if(_.isString(namespaces)) {
        query.where('namespace').equals(namespaces);
    } else if(_.isArray(namespaces)) {
        query.in('namespace', namespaces);
    }
    query.exec(callback);
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
