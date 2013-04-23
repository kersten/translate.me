define(['jquery', 'underscore'], function($, _) {
    var translations = {};

    $.ajax({
        url: '/translate.me/api/json/translations',
        method: 'get',
        success: function(data) {
            _.each(data, function(t) {
                if(t.value) {
                    if (!translations[t.locale]) {
                        translations[t.locale] = {};
                    }
                    if (!translations[t.locale][t.namespace]) {
                        translations[t.locale][t.namespace] = {};
                    }
                    translations[t.locale][t.namespace][t.key] = t.value;
                }
            });
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log("Could not retrieve translation. This is the JQuery response:", {
                jqXHR: jqXHR,
                textStatus: textStatus,
                errorThrown: errorThrown
            });
        }
    });

    return {
        get: function(locale, namespace, key) {
            if(translations) {
                if(translations[locale]
                    && translations[locale][namespace]
                    && translations[locale][namespace][key]) {
                    return translations[locale][namespace][key];
                }
            } else {
                throw new Error("Could not get translations. Invalid state. No translations have been loaded.");
            }
        },

        createMaster: function(namespace, key) {
            var translation = {
                namespace: namespace,
                key: key
            };

            $.ajax({
                url: '/translate.me/api/json/translations',
                method: 'post',
                data: translation,
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("Could not save translation: ", translation, "JQuery response:", {
                        jqXHR: jqXHR,
                        textStatus: textStatus,
                        errorThrown: errorThrown
                    });
                }
            });
        }
    }
});
