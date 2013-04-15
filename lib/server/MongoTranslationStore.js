var _ = require("underscore")._,
    async = require("async"),
    l = require("locale"),
    mongoose = require("mongoose"),
    schema = new mongoose.Schema({
        locale: String,
        namespace: String,
        key: {
            type: String,
            required: true
        },
        value: String,
        origin: {
            type: String,
            enum: ['static', 'dynamic']
        },
        created: {
            type: Date,
            default: Date.now
        },
        changed: {
            type: Date,
            default: Date.now
        }
    }),
    TranslationModel, MongoTranslationStore;

schema.pre('save', function (next) {
    'use strict';

    this.set({changed: new Date()});
    next();
});

schema.index({key: true, namespace: true, locale: true}, {unique: true});

TranslationModel = mongoose.model("translation", schema);

MongoTranslationStore = function(mongoURL) {
    'use strict';
    if(mongoURL) {
        mongoose.connect(mongoURL);
    }
};

MongoTranslationStore.prototype.getTranslationById = function(id, callback) {
    'use strict';

    TranslationModel.findById(id, callback);
};

MongoTranslationStore.prototype.getTranslations = function(conditions, callback) {
    'use strict';

    var query = TranslationModel.find(),
        locales = conditions.locale, // Array or String
        namespaces = conditions.namespace; // Array or String

    query.select('-_id key namespace locale value origin');
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

MongoTranslationStore.prototype.ready = function(callback) {
    'use strict';

    TranslationModel.ensureIndexes(callback);
};

module.exports = MongoTranslationStore;
