define(['underscore', 'backbone'], function(_, Backbone) {
    'use strict';

    return Backbone.Collection.extend({
        url: "/translate.me/api/json/locales",

        parse: function (response) {
            var result = [];
            _.each(response, function (localeCode) {
                result.push({
                    code: localeCode
                });
            });
            return result;
        }
    });
});
