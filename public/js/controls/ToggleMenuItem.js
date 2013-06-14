define(['underscore', 'backbone'], function(_, Backbone) {
    return Backbone.View.extend({
        tagName: 'li',
        className: 'menu-item',
        template: _.template(
            '<a href="#"><i class="icon"></i><span><%= text %></span></a>'
        ),

        initialize: function () {
            this.toggled = false;
        },

        events: {
            "click a": "handleChange"
        },

        render: function () {
            this.$el.append(this.template({
                text: this.options.text
            }));
            this.reRender();
            return this;
        },

        reRender: function() {
            var $i;

            if(this.$el && ($i = this.$el.find('i.icon'))) {
                $i.toggleClass('icon-check', this.toggled);
                $i.toggleClass('icon-check-empty', !this.toggled);
            }
        },

        getToggle: function () {
            return this.toggled;
        },

        setToggle: function(toggled) {
            this.toggled = toggled;
            this.reRender();
        },

        handleChange: function () {
            this.setToggle(!this.toggled);
            this.fireToggleChanged(this.toggled);
            return false;
        },

        fireToggleChanged: function (toggled) {
            this.trigger('toggle:changed', toggled);
        }
    });
});
