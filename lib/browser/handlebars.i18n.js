(function (define) {
    define(["handlebars", "./underscore.translate.js"], function (Handlebars, _) {
        Handlebars.registerHelper("translation", function(options) {
            var key = options.hash.key,
                namespace;

            if(!key) {
                throw "Invalid translation statement! Argument 'key' is missing!";
            }

            if(options.hash && options.hash.namespace) {
                namespace = options.hash.namespace;
            } else if(options.data && options.data.namespace) {
                namespace = options.data.namespace;
            } else {
                namespace = "";
            }

            return _.translate(key, namespace, this);
        });

        Handlebars.registerHelper("namespace", function(options) {
            var namespace = options.hash.name || ""
            return options.fn(this, {data: {namespace: namespace }});
        });
    });
})(typeof define=="function"?define:function(factory){module.exports=factory.apply(this, deps.map(require));});
