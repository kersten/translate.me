define(['underscore', 'backbone', './LocaleCollection'], function(_, Backbone, LocaleCollection) {
    'use strict';

    return Backbone.View.extend({
        tagName  : 'select',
        className: 'combobox',

        collection: new LocaleCollection(null, {
            comparator: function (model) {
                return model.get("code").toLowerCase();
            }
        }),

        events: {
            "change": "handleLocaleChanged"
        },

        initialize: function () {
            var self = this;

            this.ready = false;
            this.locale = null;
            this.collection.fetch({
                success: function () {
                    self.ready = true;
                    self.fireLocalesLoaded(self.collection);
                    self.render();
                }
            });
        },

        render: function () {
            var self = this;

            this.$el.children().remove();
            this.collection.each(function (model) {
                var locale = model.get('code'),
                    $option = $("<option></option>");

                $option.attr("value", locale);
                $option.text(locale);
                if(locale === self.locale) {
                    $option.attr('selected', true);
                }
                self.$el.append($option);
            });

            return this;
        },

        isReady: function () {
            return this.ready;
        },

        getLocale: function () {
            return this.locale;
        },

        setLocale: function (locale) {
            var $option;

            if (this.$el && ($option =  this.$el.find('option[value=' + locale + ']'))) {
                $option.attr('selected', true);
            }
            this.locale = locale;
        },

        handleLocaleChanged: function (event) {
            var locale = $(event.target).find(":selected").attr("value");

            this.locale = locale;
            this.fireLocaleChanged(locale);
        },

        fireLocaleChanged: function (countryCode) {
            this.trigger("locale:changed", countryCode);
        },

        fireLocalesLoaded: function (languages) {
            this.trigger("locales:loaded", languages);
        }
    });
});
