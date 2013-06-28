define(['underscore', 'backbone'], function(_, Backbone) {
    'use strict';

    return Backbone.Collection.extend({
        url: "/translate.me/api/json/translations",

        model: Backbone.Model.extend({
            idAttribute: '_id',

            parse: function(response) {
                response.created = new Date(response.created);
                _.each(response.translations, function(translation) {
                    translation.created = new Date(translation.created);
                    translation.changed = new Date(translation.changed);
                });
                return response;
            },

            getValue: function(locale) {
                var value = null,
                    translatedValue = _.findWhere(this.get('translations'), {
                        locale: locale
                    });

                if(translatedValue && translatedValue.value) {
                    value = translatedValue.value;
                }
                return value;
            },

            setValue: function(locale, value) {
                var translation = _.findWhere(this.get('translations'), {
                    locale: locale
                });

                if(value.length > 0) {
                    if(translation) {
                        translation.value = value;
                    } else {
                        this.get('translations').push({
                            locale: locale,
                            value: value
                        });
                    }
                } else {
                    this.set('translations', _.reject(this.get('translations'), function(translation) {
                        return translation.locale === locale;
                    }));
                }
            },

            getLastChanged: function(locale) {
                var lastChanged = null,
                    translation;

                if(locale) {
                    translation = _.findWhere(this.get('translations'), {
                        locale: locale
                    });
                    if(translation) {
                        lastChanged = translation.changed;
                    }
                }

                return lastChanged;
            }
        })
    });
});
