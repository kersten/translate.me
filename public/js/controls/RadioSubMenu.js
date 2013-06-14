define(['underscore', 'backbone', 'tpl!./RadioSubMenu.tpl'], function(_, Backbone, template) {
    'use strict';

    return Backbone.View.extend({
        tagName: 'li',
        className: 'dropdown-submenu',
        template: template,
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
