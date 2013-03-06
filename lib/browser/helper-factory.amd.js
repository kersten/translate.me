define(function() {
    return {
        createNamespaceHelper: function() {
            return function(options) {
                var namespace = options.hash.name || "";
                return options.fn(this, {data: {namespace: namespace }});
            }
        },

        createTranslationHelper: function(translate) {
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

                return translate.translate(key, namespace, this);
            }
        }
    }
});
