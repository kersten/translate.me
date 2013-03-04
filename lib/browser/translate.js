define(["underscore", "jquery", "handlebars", "/translate.me/api/require/translations"],
    function (_, $, Handlebars, translations) {
        var placeholderRegex = /\{\{(.+?)\}\}/g,
            translationsByLocale = {},
            translate, preferedLocale;

        _.each(translations, function(t) {
            if(t.value) {
                if (!translationsByLocale[t.locale]) {
                    translationsByLocale[t.locale] = {};
                }
                if (!translationsByLocale[t.locale][t.namespace]) {
                    translationsByLocale[t.locale][t.namespace] = {};
                }
                translationsByLocale[t.locale][t.namespace][t.key] = t.value;
            }
        });

        function replacePlaceholderWithObjectValues(string, object) {
            var result, match, value, replacementCorrection = 0;

            if(string) {
                result = string;
                if(object) {
                    while((match = placeholderRegex.exec(string))) {
                        if((value = get(object, match[1].split(".")))) {
                            result = result.substring(0, placeholderRegex.lastIndex - match[0].length + replacementCorrection) + value
                                + result.substring(placeholderRegex.lastIndex + replacementCorrection);
                            replacementCorrection = (match[0].length - value.length) * -1;
                        }
                    }
                }
            }

            return result;
        }

        /**
         * Extracts a value from the passed object, based on the passed property path.
         *
         * @param {Object} object to extract a value from
         * @param {String[]} path of property names to go through to get the value from
         * @param {Number} [index] to start from in the path. Not necessary for default use.
         * @returns {Object} the value from the object, based on the passed path. Undefined, if the path does not match the object, or
         *              no value is specified
         */
        function get(object, path, index) {
            var index = index ? index : 0,
                propertyName = path[index];

            if(object && path && propertyName) {
                return this.get(object[propertyName], path, ++index);
            }
            return object;
        }

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

            return translate.translate(key, namespace, this);
        });

        Handlebars.registerHelper("namespace", function(options) {
            var namespace = options.hash.name || ""
            return options.fn(this, {data: {namespace: namespace }});
        });

        translate = {
            /**
             * key
             * key, context
             * key, namespace
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
                args.locale = preferedLocale;
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
                if (args.namespace === undefined) { throw "The parameter \"namespace\" is required!"; }
                if (!args.locale) { throw "The parameter \"locale\" is required!"; }

                if(translationsByLocale && translationsByLocale[args.locale]
                    && translationsByLocale[args.locale][args.namespace]
                    && translationsByLocale[args.locale][args.namespace][args.key]) {
                    result = translationsByLocale[args.locale][args.namespace][args.key];
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
            },

            /**
             * Sets the default locale for underscore translate.
             *
             * @param locale {String} a locale to translate by default with
             */
            setLocale: function(locale) {
                preferedLocale = locale;
            }
        };

        return translate;
    }
);
