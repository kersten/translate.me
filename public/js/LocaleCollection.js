define(['underscore', 'backbone', './data/locales'], function(_, Backbone, locales) {
    'use strict';

    return Backbone.Collection.extend({
        url: "/translate.me/api/json/locales",

        parse: function (response) {
            var result = [];
            _.each(response, function (localeCode) {
                result.push({
                    name: locales[localeCode].name,
                    code: localeCode
                });
            });
            return result;
        }
    });
});
