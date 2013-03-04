define(["underscore", "jquery", "./traverse.util", "/translate.me/api/require/translate"],
    function (_, $, traverse, translations) {
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
            /**
             * key
             * key, namespace
             * key, locale
             * key, locale, context
             * key, namespace, context
             * key, namespace, locale
             * key, namespace, locale, context
             * {
             *   key: key,
             *   namespace: namespace,
             *   locale: locale,
             * }
             * @returns {*}
             */
            translate: function (arg1, arg2, arg3, arg4) {
                var result, args = {};

                args.namespace = "";
                args.locale = this.locale;
                if (_.isObject(arg1)) {
                    args = arg1;
                } else if (_.isString(arg1)) {
                    args.key = arg1;
                }
                if (_.isObject(arg2)) {
                    args.context = arg2;
                } else if (_.isString(arg2)) {
                    args.namespace = arg2;
                }
                if (_.isObject(arg3)) {
                    args.context = arg3;
                } else if (_.isString(arg3)) {
                    args.locale = arg3;
                }
                args.context = arg4;

                if (!args.key) { throw "The parameter \"key\" is required!"; }
                if (!args.namespace) { throw "The parameter \"namespace\" is required!"; }
                if (!args.locale) { throw "The parameter \"locale\" is required!"; }

                if(translations && translations.requestedTranslations
                    && translations.requestedTranslations[args.namespace]
                    && translations.requestedTranslations[args.namespace][key]) {
                    result = translations.requestedTranslations[args.namespace][key];
                } else {
                    result = args.key;
                }
                /*else {
                    if(!_.contains(translations.allKeys, key)) {
                        $.post("/translate.me/api/json/translations", {
                            namespace: args.namespace,
                            key: key
                        });
                        translations.allKeys.push(key);
                    }
                }*/

                if(args.context) {
                    result = replacePlaceholderWithObjectValues(result, args.context);
                }

                return result;
            }
        });

        _.mixin({
            /**
             * Sets the default locale for underscore translate.
             *
             * @param locale {String} a locale to translate by default with
             */
            setLocale: function(locale) {
                this.locale = locale;
            }
        });

        return _;
    }
);
