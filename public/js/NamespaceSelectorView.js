define(['underscore', 'backbone', './NamespaceCollection', 'purl'], function(_, Backbone, NamespaceCollection) {
    'use strict';

    return Backbone.View.extend({
        tagName: "select",

        collection: new NamespaceCollection(null, {
            comparator: function (model) {
                return model.get("namespace").toLowerCase();
            }
        }),

        events: {
            "change": "handleNamespaceChanged"
        },

        initialize: function () {
            var self = this;

            this.ready = false;
            this.namespace = null;
            this.collection.fetch({
                success: function () {
                    self.ready = true;
                    self.fireNamespacesLoaded(self.collection);
                    self.render();
                }
            });
        },

        render: function () {
            var self = this;

            this.$el.children().remove();
            this.$el.append($('<option value=>All namespaces</option>'));
            this.collection.each(function (model) {
                var namespace = model.get("namespace"),
                    $option = $("<option></option>");

                $option.attr("value", namespace);
                $option.text(namespace);
                if(namespace === self.namespace) {
                    $option.attr('selected', true);
                }
                self.$el.append($option);
            });

            return this;
        },

        isReady: function () {
            return this.ready;
        },

        getNamespace: function () {
            return this.namespace;
        },

        setNamespace: function (namespace) {
            var $option;

            if (this.$el && ($option =  this.$el.find('option[value="' + namespace + '"]'))) {
                $option.attr('selected', true);
            }
            this.namespace = namespace;
        },

        handleNamespaceChanged: function (event) {
            var namespace = $(event.target).find(":selected").attr("value");

            if(namespace !== undefined && namespace.length === 0) {
                namespace = null;
            }
            this.namespace = namespace;
            this.fireNamespaceChanged(namespace);
        },

        fireNamespacesLoaded: function(collection) {
            this.trigger("namespaces:loaded", collection);
        },

        fireNamespaceChanged: function (namespace) {
            this.trigger("namespace:changed", namespace);
        }
    });
});
