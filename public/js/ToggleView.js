define(['underscore', 'backbone'], function(_, Backbone) {
    return Backbone.View.extend({
        tagName: 'label',
        className: 'checkbox',
        template: _.template(
            '<input type="checkbox"> <%= text %>'
        ),

        initialize: function () {
            this.toggled = null;
        },

        events: {
            "change input": "handleChange"
        },

        render: function () {
            this.$el.append(this.template({
                text: this.options.text
            }));
            if(this.toggled === true) {
                this.$el.find('input').attr('checked', 'checked');
            }
            return this;
        },

        getToggle: function () {
            return this.toggled;
        },

        setToggle: function(toggled) {
            var $input;

            if(this.$el && ($input = this.$el.find('input'))) {
                if(toggled) {
                    $input.attr('checked', 'checked');
                } else {
                    $input.removeAttr('checked');
                }
            }
            this.toggled = toggled;
        },

        handleChange: function () {
            var toggled = this.$el.find('input').is(':checked');

            this.toggled = toggled;
            this.fireToggleChanged(toggled);
        },

        fireToggleChanged: function (toggled) {
            this.trigger('toggle:changed', toggled);
        }
    });
});
