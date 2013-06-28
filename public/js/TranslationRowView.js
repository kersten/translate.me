define(['underscore', 'backbone', 'tpl!./TranslationRowView.tpl', 'jquery.color'], function(_, Backbone, template) {
    'use strict';

    return Backbone.View.extend({
        tagName: "tr",
        template: template,

        events: {
            "change textarea": "update"
        },

        initialize: function(options) {
            this.locale = options.locale;
        },

        render: function() {
            var lastChanged = this.model.getLastChanged(this.locale);

            this.$el.html(this.template({
                _id: this.model.get('_id'),
                key: this.model.get('key'),
                created: this.model.get('created').toLocaleString(),
                changed: lastChanged ? lastChanged.toLocaleString() : '-',
                value: this.model.getValue(this.locale)
            }));
            return this;
        },

        update: function (e) {
            var self = this;
            this.model.setValue(this.locale, $(e.currentTarget).val());
            this.model.save({}, {
                success: function () {
                    self.render();
                    self.$el.removeClass().addClass("success");
                    self.$el.find("td").animate({backgroundColor: "#ffffff"}, 2000, function () {
                        self.$el.removeClass("success");
                        self.$el.find("td").css("background-color", "");
                    });
                },
                error  : function () {
                    self.$el.removeClass().addClass("error");
                    self.$el.find("td").animate({backgroundColor: "#ffffff"}, 2000, function () {
                        self.$el.removeClass("error");
                        self.$el.find("td").css("background-color", "");
                    });
                }
            });
        },

        /**
         * Sets the locale to edit in this view. Default is null and creates a new translation in the default locale.
         *
         * @param {string} locale to edit in the view, may be null null or undefined
         */
        setLocale: function(locale) {
            this.locale = locale;
            //TODO locale = null?
            this._updateValue(this.model.getValue(locale));
            this._updateChanged(this.model.getLastChanged(locale));
        },

        /**
         * @returns {string} locale which will be displayed in this view, may be undefined or null
         */
        getLocale: function() {
            return this.locale;
        },

        _updateValue: function(value) {
            this.$el.find('textarea').val(value);
        },

        _updateChanged: function(date) {
            var value = "-";

            if(date) {
                value = date.toLocaleString();
            }
            this.$el.find('span.changed').text(value);
        }
    });
});
