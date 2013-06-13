define(['underscore', 'backbone'], function(_, Backbone) {
    'use strict';

    return Backbone.View.extend({
        tagName: 'div',
        className: 'input-append',

        template: _.template(
            '<input type="text" class="search-query" placeholder="Search for keys and translations" />' +
            '<button class="btn"><i class="icon-remove"></i></button>'
        ),

        events: {
            "keyup input": "handleKeyPress",
            "click button": "handleButtonClick"
        },

        initialize: function () {
            this.searchQuery = null;
        },

        render: function () {
            this.$el.html(this.template());
            if(this.searchQuery) {
                this.$el.find('input').val(this.searchQuery);
            }
            return this;
        },

        handleButtonClick: function () {
            this.setQuery(null);
            this.fireSearchQueryChanged(null);
        },

        handleKeyPress: function (event) {
            var $input = $(event.currentTarget),
                searchQuery = $input.val();

            if (this.searchQuery === null || this.searchQuery !== searchQuery) {
                this.searchQuery = searchQuery;
                this.fireSearchQueryChanged(searchQuery);
            }
        },

        getQuery: function () {
            return this.searchQuery;
        },

        setQuery: function (query) {
            if(this.$el) {
                this.$el.find('input').val(query);
            }
            this.searchQuery = query;
        },

        fireSearchQueryChanged: function (query) {
            this.trigger("query:changed", query);
        }
    });
});
