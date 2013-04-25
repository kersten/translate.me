define(['jquery'], function($) {
    var translations = [];



    return {
        get: function(done) {
            if(typeof done !== 'function') {
                throw new TypeError("The argument done, must be function.");
            }

            $.ajax({
                url: '/translate.me/api/json/translations/new',
                method: 'get',
                success: function(data) {
                    done(data);
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log("Could not retrieve translation. This is the JQuery response:", {
                        jqXHR: jqXHR,
                        textStatus: textStatus,
                        errorThrown: errorThrown
                    });
                }
            });
        },

        createMaster: function(namespace, key, created) {
            var translation = {
                namespace: namespace,
                key: key
            };

            $.ajax({
                url: '/translate.me/api/json/translations',
                method: 'post',
                data: translation,
                success: function(t) {
                    created({
                        namespace: t.namespace,
                        key: t.key
                    });
                },
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
