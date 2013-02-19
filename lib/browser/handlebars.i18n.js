(function (define) {
    define(["handlebars", "./underscore.translate.js"], function (Handlebars, _) {
        function translate () {
            var args = {}, context;

            _.each(arguments, function (arg) {
                if (typeof arg === "string" && arg.substring(0, 3) === "ns:") {
                    args.namespace = arg;
                } else if (!args.key) {
                    args.key = arg;
                }
            });

            if (!(this instanceof Window)) {
                context = this;
            }

            return _.translate(args.key, args.namespace, context);
        }

        Handlebars.registerHelper("i18n", translate);

        return translate;
    });
})(typeof define=="function"?define:function(factory){module.exports=factory.apply(this, deps.map(require));});
