define(['underscore', 'backbone', './TranslationRowView', './TranslationCollection', 'tpl!./TranslationTableView.tpl'],
    function(_, Backbone, TranslationRowView, TranslationCollection, template) {
    'use strict';

    return Backbone.View.extend({
        tagName: "table",
        className: "table table-hover",
        template: template,

        collection: new TranslationCollection(null, {
            comparator: function (model) {
                return model.get("namespace").toLowerCase() + model.get("key").toLowerCase();
            }
        }),

        initialize: function() {
            this.locale = null;
            this.renderTranslated = true;
            this.rows = [];
        },

        render: function () {
            var currentNamespace = null,
                $tbody;

            this.$el.html(this.template());
            $tbody = this.$el.find('tbody');

            this.collection.each(function (model) {
                var namespace, row;

                if(this.renderTranslated || !model.getValue(this.locale)) {
                    namespace = model.get('namespace'),
                    row = new TranslationRowView({
                        model: model,
                        locale: this.locale
                    });

                    if (currentNamespace === null || currentNamespace !== namespace) {
                        $tbody.append(_.template('<tr><th colspan="2">Namespace: <%= namespace %></th></tr>', {namespace: namespace}));
                        currentNamespace = namespace;
                    }

                    this.rows.push(row);
                    $tbody.append(row.render().$el);
                }
            }, this);

            return this;
        },

        showTranslated: function() {
            this.renderTranslated = true;
            this.render();
        },

        hideTranslated: function() {
            this.renderTranslated = false;
            this.render();
        },

        setLocale: function(locale) {
            this.locale = locale;
            _.each(this.rows, function(row) {
                row.setLocale(locale);
            });
        },

        getLocale: function() {
            return this.locale;
        }
    });
});
