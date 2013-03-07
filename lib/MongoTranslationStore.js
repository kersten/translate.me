var _ = require("underscore")._,
    async = require("async"),
    l = require("locale"),
    mongoose = require("mongoose"),
    schema = new mongoose.Schema({
        locale: String,
        namespace: String,
        key: String,
        value: String
    }),
    TranslationModel;

schema.index({key: true, namespace: true, locale: true}, {unique: true});
TranslationModel = mongoose.model("translation", schema);

MongoTranslationStore = function(mongoURL) {
    if(mongoURL) {
        mongoose.connect(mongoURL);
    }
}

MongoTranslationStore.prototype.getTranslationById = function(id, callback) {
    TranslationModel.findById(id).exec(callback);
}

MongoTranslationStore.prototype.getTranslations = function(conditions, callback) {
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

MongoTranslationStore.prototype.createOrUpdateTranslation = function(translation, callback) {
    var condition = _.pick(translation, 'locale', 'namespace', 'key');
    TranslationModel.findOneAndUpdate(condition, translation, {new: true, upsert: true}, callback);
}

MongoTranslationStore.prototype.updateTranslationById = function(id, translation, callback) {
    TranslationModel.findByIdAndUpdate(id, translation, {new: true}, callback);
}

MongoTranslationStore.prototype.getNamespaces = function(callback) {
    TranslationModel.distinct('namespace').exec(callback);
}

MongoTranslationStore.prototype.getStats = function(callback) {
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

MongoTranslationStore.prototype.createMetaTranslation = function(translation, source, callback) {
    if(!translation) {
        throw "Please pass a translation.";
    }
    if(!translation.key) {
        throw "The key of the passed translation: " + JSON.stringify(translation) + " is empty or undefined.";
    }
    if(translation.namespace === undefined) {
        throw "The namespace of the passed translation: " + JSON.stringify(translation) + " is undefined.";
    }
    TranslationModel.create(translation, function(err, translation) {
        if(_.isFunction(callback)) {
            callback(err, translation);
        }
    });
}

MongoTranslationStore.prototype.ready = function(callback) {
    TranslationModel.ensureIndexes(callback);
}

module.exports = MongoTranslationStore;
