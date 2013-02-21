(function (define, node) {
    "use strict";

    define(["underscore", "./traverse.util.js", (node) ? "../translations" : "/i18n/require/translations"],
        function (_, traverse, translations) {


            var placeholderRegex = /\{\{(.+?)\}\}/g;

            function replacePlaceholderWithObjectValues(string, object) {
                var result, match, value, replacementCorrection = 0;

                if(string) {
                    result = string;
                    if(object) {
                        while((match = placeholderRegex.exec(string))) {
                            if((value = traverse.get(object, match[1].split(".")))) {
                                result = result.substring(0, placeholderRegex.lastIndex - match[0].length + replacementCorrection) + value
                                    + result.substring(placeholderRegex.lastIndex + replacementCorrection);
                                replacementCorrection = (match[0].length - value.length) * -1;
                            }
                        }
                    }
                }

                return result;
            }

            _.mixin({
                translate: function () {
                    var key = arguments[0],
                        result = key,
                        args = {};

                    if(!key) {
                        throw "You must pass a key, when calling translate!";
                    }

                    _.each(_.rest(arguments), function(arg) {
                        if(typeof arg === "string" && arg.substring(0, 3) === "ns:") {
                            args.namespace = arg;
                        } else if(typeof arg === "object") {
                            args.replaceObject = arg;
                        }
                    });

                    if(!args.namespace) {
                        args.namespace = "";
                    } else {
                        args.namespace = args.namespace.replace("ns:", ""); // Strip "ns:" placeholder if it exists
                    }

                    if(translations && translations[args.namespace] && translations[args.namespace][key]) {
                        result = translations[args.namespace][key];
                    }

                    if(args.replaceObject) {
                        result = replacePlaceholderWithObjectValues(result, args.replaceObject);
                    }

                    return result;
                }
            });

            return _;
        });
})(typeof define=="function"?define:function(factory){module.exports=factory.apply(this, deps.map(require));}, typeof define=="function"?false:true);
