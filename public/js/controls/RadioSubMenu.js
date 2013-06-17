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
            if(!this.collection) {
                this.collection = new Backbone.Collection();
            }
            this.listenTo(this.collection, 'add remove', _.debounce(function() {
                self.render();
            }, 50));
        },

        render: function() {
            var self = this,
                createItems = function(coll) {
                    var items = [];

                    coll.each(function(model) {
                        items.push({
                            value: model.get(self.options.fields.value),
                            label: model.get(self.options.fields.label)
                        });
                    });

                    return items;
                };

            this.$el.children().remove();
            this.$el.append(this.template({
                label: this.options.label,
                icon: this.options.icon,
                selectedValue: this.getSelectedValue(),
                items: createItems(this.collection)
            }));
            return this;
        },

        handleClick: function(event) {
            var self = this,
                $li = $(event.currentTarget),
                value = $li.data('value'),
                item = this.collection.find(function(item) {
                    return item.get(self.options.fields.value) == value;
                });

            if(this.options.allowNone && this.getSelectedValue() === item.get(this.options.fields.value)) {
                this.selectedItem = new Backbone.Model();
            } else {
                this.selectedItem = item;
            }
            this._fireItemSelected(this.selectedItem);
            this.render();
            return false;
        },

        getSelectedValue: function() {
            var value = null;

            if(this._getSelectedItem()) {
                value = this._getSelectedItem().get(this.options.fields.value);
            }
            return value;
        },

        selectValue: function(value) {
            if(!value) {
                throw new Error("The passed value is undefined or null");
            }
            var query = {}, item;

            query[this.options.fields.value] = value;
            item = this.collection.findWhere(query);

            this._selectItem(item);
        },

        _selectItem: function(item) {
            if(item === undefined) {
                throw new Error('The passed argument item is undefined.');
            } else if(item === null) {
                item = new Backbone.Model();
            }
            this.selectedItem = item;
            this.render();
        },

        _getSelectedItem: function() {
            return this.selectedItem;
        },

        _fireItemSelected: function(item) {
            this.trigger('selection:changed', item);
        }
    });
});
