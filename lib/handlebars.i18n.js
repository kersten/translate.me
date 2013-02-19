(function(define){
    define(function(require, exports){
        // module contents
        var handlebars = require("handlebars"),
            _ = require("underscore")._,
            translate = require("./underscore.translate");
        exports = function () {
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
        };
    });
})(typeof define === "function" ? define : function (factory) { factory(require,exports); });
