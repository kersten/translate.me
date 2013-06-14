define(['underscore', 'backbone', './data/locales'], function(_, Backbone, locales) {
    'use strict';

    return Backbone.Collection.extend({
        url: "/translate.me/api/json/locales",

        parse: function (response) {
            var result = [];
            _.each(response, function (localeCode) {
                result.push({
                    label: locales[localeCode].name,
                    value: localeCode
                });
            });
            return result;
        }
    });
});
