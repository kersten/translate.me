var _ = require("underscore")._,
    async = require("async"),
    l = require("locale"),
    mongoose = require("mongoose"),
    TranslationModel = mongoose.model("translation", require('./TranslationSchema'));

function MongoTranslationStore (mongoURL) {
    'use strict';

    if(mongoURL) {
        mongoose.connect(mongoURL);
    }
}

MongoTranslationStore.prototype.Model = TranslationModel;

MongoTranslationStore.prototype.ready = function(callback) {
    'use strict';

    TranslationModel.ensureIndexes(callback);
};

/**
 * Retrieves a translation by the passed id.
 *
 * @param {string} id to retrieve the translation for
 * @param {function(object, [object])} callback which receives a nullable error object and an optional
 * translation object when the translation has been retrieved.
 * @throws TypeError if the passed id is not a string or the passed callback is not a function
 * @throws Error if the passed id is empty
 */
MongoTranslationStore.prototype.getTranslationById = function(id, callback) {
    'use strict';

    if(typeof id !== 'string') { throw new TypeError("The passed argument id is not a string."); }
    if(id.length <= 0) { throw new Error("The passed id is empty."); }
    if(typeof callback !== 'function') { throw new TypeError("The passed argument callback is not a function."); }

    TranslationModel.findById(id, function(err, translationModel) {
        if(!err && translationModel) {
            callback(null, translationModel.toJSON());
        } else {
            callback(err, undefined);
        }
    });
};

/**
 * Retrieves translations. Can be optionally restricted by an conditions object.
 *
 * @param {object|null} conditions to filter for translations. May be null or empty
 * @param {string|string[]} [conditions.locales] a string or an string[] of locales
 * @param {string|string[]} [conditions.namespaces] a string or an string[] of namespaces
 * @param {function(object, [object[]])} callback which receives a nullable error object and an optional array of
 * translations, when the translations have been retrieved
 * @throws TypeError if the passed conditions is not an object/null or the passed callback is not a function
 */
MongoTranslationStore.prototype.getTranslations = function(conditions, callback) {
    'use strict';

    if(conditions !== null && typeof conditions !== 'object') {
        throw new TypeError("The passed argument has been specified, but is not null or an object.");
    }
    if(typeof callback !== 'function') {
        throw new TypeError("The passed argument callback is not a function");
    }

    var query = TranslationModel.find();
    query.select();
    if(!_.isEmpty(conditions)) {
        if(_.isString(conditions.locales)) {
            query.where('locale').equals(conditions.locales);
        } else if(_.isArray(conditions.locales)) {
            query.in('locale', conditions.locales);
        }
        if(_.isString(conditions.namespaces)) {
            query.where('namespace').equals(conditions.namespaces);
        } else if(_.isArray(conditions.namespaces)) {
            query.in('namespace', conditions.namespaces);
        }
        if (_.isObject(conditions) && !conditions.locales && !conditions.namespaces) {
            _.each(conditions, function (value, key) {
                if (key === '$or') {
                    query.or(value);
                } else {
                    query.where(key, value);
                }
            });
        }
    }
    query.exec(function(err, translationModels) {
        var translations = [];
        if(!err && translationModels) {
            _.each(translationModels, function(translationModel) {
                translations.push(translationModel.toJSON());
            });
            callback(null, translations);
        } else {
            callback(err, undefined);
        }
    });
};

MongoTranslationStore.prototype.getNamespaces = function(callback) {
    'use strict';

    TranslationModel.distinct('namespace').exec(callback);
};

MongoTranslationStore.prototype.getStats = function(callback) {
    'use strict';

    TranslationModel.collection.group({
        'locale':true
    }, null, {
        numberOfTranslations: 0,
        numberOfTranslationsWithValue: 0
    }, function(doc, prev) {
        prev.numberOfTranslations += 1;
        if(doc.value) {
            prev.numberOfTranslationsWithValue += 1;
        }
    }, null, true, callback);
};

MongoTranslationStore.prototype.createOrUpdateTranslation = function(translation, callback) {
    'use strict';

    var doc = _.pick(translation, 'locale', 'namespace', 'key');

    TranslationModel.findOne(doc, function (err, doc) {
        if (err || doc === null) {
            doc = new TranslationModel();
        }
        doc.set(translation);
        doc.save(callback);
    });
};

MongoTranslationStore.prototype.updateTranslationById = function(id, translation, callback) {
    'use strict';

    TranslationModel.findOne({_id: id}, function (err, doc) {
        if (err || doc === null) {
            doc = new TranslationModel();
        }

        doc.set(translation);
        doc.save(callback);
    });
};

MongoTranslationStore.prototype.createMasterTranslation = function(translation, source, callback) {
    'use strict';

    if(!translation) {
        throw "Please pass a translation.";
    }
    if(!translation.key) {
        throw "The key of the passed translation: " + JSON.stringify(translation) + " is empty or undefined.";
    }
    if(translation.namespace === undefined) {
        throw "The namespace of the passed translation: " + JSON.stringify(translation) + " is undefined.";
    }
    TranslationModel.findOne({namespace: translation.namespace, key: translation.key}, function(err, doc) {
        if (doc === null) {
            doc = new TranslationModel();
            doc.set(translation);
            doc.save(function(err, doc) {
                if(_.isFunction(callback)) {
                    callback(err, doc);
                }
            });
        }
    });
};

module.exports = MongoTranslationStore;
