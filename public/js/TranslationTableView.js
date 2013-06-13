define(['underscore', 'backbone', './TranslationRowView', './TranslationCollection'],
    function(_, Backbone, TranslationRowView, TranslationCollection) {
    'use strict';

    return Backbone.View.extend({
        tagName: "table",
        className: "table table-hover",
        template: _.template('' +
            '<thead>' +
            '<tr>' +
            '<th style="width: 50%">Key</th>' +
            '<th style="width: 50%">Translation</th>' +
            '</thead>' +
            '</tr>' +
            '<tbody>' +
            '</tbody>'),

        collection: new TranslationCollection(null, {
            comparator: function (model) {
                return model.get("namespace").toLowerCase() + model.get("key").toLowerCase();
            }
        }),

        render: function () {
            var currentNamespace = null,
                $tbody;

            this.$el.html(this.template());
            $tbody = this.$el.find('tbody');

            this.collection.each(function (model) {
                var namespace = model.get('namespace');

                if (currentNamespace === null || currentNamespace !== namespace) {
                    $tbody.append(_.template('<tr><th colspan="2">Namespace: <%= namespace %></th></tr>', {namespace: namespace}));
                    currentNamespace = namespace;
                }

                $tbody.append(new TranslationRowView({model: model}).render().$el);
            }, this);

            return this;
        }
    });
});
