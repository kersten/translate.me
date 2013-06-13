define(['underscore', 'backbone'], function(_, Backbone) {
    'use strict';

    return Backbone.Collection.extend({
        url: "/translate.me/api/json/translations",

        parse: function (response) {
            var res = [];
            _.each(response, function (translation) {
                res.push({
                    _id      : translation._id,
                    key      : translation.key,
                    value    : translation.value,
                    locale   : translation.locale,
                    namespace: translation.namespace,
                    created: translation.created
                });
            });
            return res;
        }
    });
});
