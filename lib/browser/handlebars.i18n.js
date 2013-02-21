(function (define) {
    define(["handlebars", "./underscore.translate.js"], function (Handlebars, _) {
        function translate () {
            var args = {}, context, result;

            _.each(arguments, function (arg) {
                if (typeof arg === "string" && arg.substring(0, 3) === "ns:") {
                    args.namespace = arg;
                } else if (typeof arg === "string" && arg.substring(0, 10) === "attribute:") {
                    args.attribute = arg.substring(10);
                } else if (!args.key) {
                    args.key = arg;
                }
            });

            if (!(this instanceof Window)) {
                context = this;
            }

            if(args.attribute) {
                result = args.attribute + '=' + _.translate(args.key, args.namespace, context);
            } else {
                result = '<span data-i18n-namespace="' + args.namespace.substring(3) + '" data-i18n-key="' + args.key
                    + '">' + _.translate(args.key, args.namespace, context) + '</span>';
            }

            return new Handlebars.SafeString(result);
        }

        Handlebars.registerHelper("i18n", translate);

        return translate;
    });
})(typeof define=="function"?define:function(factory){module.exports=factory.apply(this, deps.map(require));});
