define(['underscore', 'backbone'], function(_, Backbone) {
    'use strict';

    return Backbone.Collection.extend({
        url: "/translate.me/api/json/namespaces",

        parse: function (response) {
            var result = [];
            _.each(response, function (namespace) {
                result.push({
                    name: namespace
                });
            });
            return result;
        }
    });
});
