define(['underscore', 'backbone'], function(_, Backbone) {
    'use strict';

    return Backbone.View.extend({
        tagName: 'li',
        className: 'dropdown-submenu',
        template: _.template(
            '<a style="cursor: default"><i class="icon <%= icon %>"></i><%= label %></a>' +
            '<% if(items.length > 0) { %>' +
            '<ul class="dropdown-menu">' +
            '<% _.each(items, function(item) { %>' +
            '<li data-value="<%= item.value %>"><a href="#">' +
            '<i class="icon <% if(selectedItem && selectedItem.get("value") === item.value) { %>icon-check<% } else { %>icon-check-empty<% } %>"></i><%= item.label %></a>' +
            '</li>' +
            '<% }); %>' +
            '</ul>' +
            '<% } %>'
        ),
        events: {
            "click ul.dropdown-menu li": "handleClick"
        },

        initialize: function() {
            var self = this;

            this.selectedItem = new Backbone.Model();
            if(this.collection) {
                this.listenTo(this.collection, 'add remove', _.debounce(function() {
                    self.render();
                }, 50));
            } else {
                this.collection = new Backbone.Collection();
            }
        },

        render: function() {
            this.$el.children().remove();
            this.$el.append(this.template({
                label: this.options.label,
                icon: this.options.icon,
                selectedItem: this.selectedItem,
                items: this.collection.toJSON()
            }));
            return this;
        },

        handleClick: function(event) {
            var $li = $(event.currentTarget),
                value = $li.data('value'),
                item = this.collection.find(function(item) {
                    return item.get('value') == value;
                });

            if(this.options.allowNone && this.selectedItem.get('value') === item.get('value')) {
                this.selectedItem = new Backbone.Model();
            } else {
                this.selectedItem = item;
            }
            this.fireItemSelected(this.selectedItem);
            this.render();
            return false;
        },

        selectItem: function(item) {
            if(item === undefined) {
                throw new Error('The passed argument item is undefined.');
            } else if(item === null) {
                item = new Backbone.Model();
            }
            this.selectedItem = item;
            this.render();
        },

        getSelectedItem: function() {
            return this.selectedItem;
        },

        fireItemSelected: function(item) {
            this.trigger('selection:changed', item);
        }
    });
});
