var _ = require('underscore')._,
    mongoose = require('mongoose'),
    util = require('util'),
    schema = new mongoose.Schema({
        key: {
            type: String,
            required: true
        },
        namespace: {
            type: String,
            required: true
        },
        created: {
            type: Date,
            required: true
        },
        sources: [{
            type: String
        }],
        translations: [{
            locale: {
                type: String,
                required: true
            },
            value: {
                type: String,
                required: true
            },
            changed: {
                type: Date,
                required: true
            },
            created: {
                type: Date,
                required: true,
                default: Date.now
            }
        }]
    });

schema.index({key: true, namespace: true}, {unique: true});

/**
 * Adds or updates a translation for a specific locale.
 *
 * @param {!string} locale to translate in
 * @param {?string} [value] which represents the translation
 * @return {{locale: string, value: string, changed: Date, created: Date}} the created or updated translation
 */
schema.methods.translate = function(locale, value) {
    var translation;

    if(typeof locale !== 'string') {
        throw new TypeError("The passed locale is not a string. Instead it's a: \"" + typeof(locale) + "\", " + locale);
    }
    if(value && typeof value !== 'string') {
        throw new TypeError("You have specified a value, but it's not a string. Instead it's a: \"" + typeof(value) + "\", " + value);
    }

    if(value === undefined || value === null) { // Remove translation
        this.translations = _.filter(this.translations, function(translation) {
            return translation.locale === locale;
        });
    } else { // Create update translation
        translation = _.find(this.translations, function(translation) {
            return translation.locale === locale;
        });
        if(!translation) {
            translation = {
                locale: locale,
                value: value,
                changed: new Date()
            }
            this.translations.push(translation);
        } else {
            translation.changed = new Date();
            translation.value = value;
        }
    }
    return translation;
}

schema.methods.updateTranslation = function(index, done) {
    if(index._id !== this._id.toString()) {
        done(new Error(util.format('Ids do not match. Is: "%s", expected: "%s".', index._id, this._id)));
        return;
    }
    delete(index._id);

    var newTranslations = [];
    _.each(index.translations, function(updatedTranslation) {
        var translation = _.findWhere(this.translations, {locale: updatedTranslation.locale});

        if(translation) {
            translation.value = updatedTranslation.value;
        } else {
            translation = {
                value: updatedTranslation.value,
                locale: updatedTranslation.locale
            }
        }
        translation.changed = new Date();
        newTranslations.push(translation);
    }, this);

    this.set(index);
    this.set('translations', newTranslations);
    this.save(done);
}

/**
 * Checks whether this translation originates from a dynamic call, hence has a computed key and could
 * not be parsed while building the translation index.
 *
 * @returns {boolean} true if the translation is static and originates from a file, otherwise false
 */
schema.methods.isStatic = function() {
    return !_.isEmpty(this.sources);
}

/**
 * Creates a new translation model or receives one from the database, if it already exists.
 *
 * @param {object} translation properties to start from
 * @param {!string} translation.key
 * @param {!string} translation.namespace
 * @param {!string[]} [translation.sources] a list of paths to files where the translation originated from
 * @param {function(?object,[object])} done function which receives an error in case anything bad happens and
 * a translation model which can be altered and saved afterwards
 */
schema.statics.getTranslationModel = function(translation, done) {
    if(typeof translation !== 'object') {
        throw new TypeError("Cannot create model. Expected translation to be an object, but got: \"" + translation + "\"");
    }
    if(typeof translation.key !== 'string') {
        throw new TypeError("Cannot create model. Expected key to be a string, but got: \"" + translation.key + "\"");
    }
    if(typeof translation.namespace !== 'string') {
        throw new TypeError("Cannot create model. Expected namespace to be a string, but got: \"" + translation.namespace + "\"");
    }
    var Model = this;

    Model.findOne({
        key: translation.key,
        namespace: translation.namespace
    }, function(err, translationModel) {
        if(!err) {
            if(!translationModel) {
                translationModel = new Model({
                    key: translation.key,
                    namespace: translation.namespace,
                    created: new Date()
                });
            }
            if(translation.sources) {
                translationModel.sources = _.union(translationModel.sources || [], translation.sources);
            }
            done(null, translationModel);
        } else {
            done(err);
        }
    })
}

module.exports = schema;
