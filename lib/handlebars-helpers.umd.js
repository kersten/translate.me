(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.handlebarsHelpers = factory();
    }
}(this, function () {
    return {
        createNamespaceBlockHelper: function() {
            return function(options) {
                var namespace = options.hash.name || "";
                return options.fn(this, {data: {namespace: namespace }});
            }
        },

        createTranslationBlockHelper: function(translator) {
            return function(options) {
                var key = options.hash.key,
                    namespace;

                if(!key) {
                    throw "Invalid translation statement! Argument 'key' is missing!";
                }

                if(options.hash && options.hash.namespace !== undefined) {
                    namespace = options.hash.namespace;
                } else if(options.data && options.data.namespace !== undefined) {
                    namespace = options.data.namespace;
                } else {
                    namespace = "";
                }

                return translator.translate(key, namespace, this);
            }
        }
    }
}));
