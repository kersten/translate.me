define(['jquery', 'underscore'], function($, _) {
    'use strict';

    /**
     * Creates a new AjaxTranslationHandler.
     *
     * @param [options] {intelligentMasterCreation: boolean} Options object
     * @param [options.intelligentMasterCreation=false] {boolean} if set to true, debounces createMaster call and filters duplicate
     * translation statements before sending post-requests to the server.
     * @constructor
     */
    var AjaxTranslationHandler = function(options) {
        if(options && options.intelligentMasterCreation) {
            this.enableIntelligentMasterCreation();
        }
    }

    AjaxTranslationHandler.prototype.get = function(done) {
        if(typeof done !== 'function') {
            throw new TypeError("The argument done, must be function.");
        }

        $.ajax({
            url: '/translate.me/api/json/translations',
            method: 'get',
            data: {
                select: ['-_id', 'key', 'namespace', 'translations.locale', 'translations.value']
            },
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
    };

    AjaxTranslationHandler.prototype.createMaster = function(namespace, key, done) {
        var translation = {
                namespace: namespace,
                key: key
            };

        $.ajax({
            url: '/translate.me/api/json/translations',
            method: 'post',
            data: translation,
            success: function(t) {
                done(null, {
                    namespace: t.namespace,
                    key: t.key
                });
            },
            error: function(jqXHR, textStatus, errorThrown) {
                done($.extend(new Error("Could not save translation"), {
                    translation: translation,
                    jquery: {
                        jqXHR: jqXHR,
                        textStatus: textStatus,
                        errorThrown: errorThrown
                    }
                }));
                console.log("Could not save translation: ", translation, {
                    jqXHR: jqXHR,
                    textStatus: textStatus,
                    errorThrown: errorThrown
                });
            }
        });
    }

    /**
     * Caches the createMaster call for a certain time and caches the requested master translations. If the wait time
     * exceeds, the original createMaster will be called and the masters will be created. Removes duplicates.
     */
    AjaxTranslationHandler.prototype.enableIntelligentMasterCreation = function() {
        var self = this,
            wait = 100, // milliseconds
            cache = {},
            lastCallDate = null,
            timeoutId;

        this._createMaster = this.createMaster;
        this.createMaster = function(namespace, key, done) {
            if(namespace && key
                && (lastCallDate === null || (new Date().valueOf() - lastCallDate.valueOf()) <= wait)) { // cache
                if(!cache[namespace + ":" + key]) {
                    cache[namespace + ":" + key] = {
                        namespace: namespace,
                        key: key,
                        callbacks: []
                    };
                }
                cache[namespace + ":" + key].callbacks.push(done);
                clearTimeout(timeoutId);
                timeoutId = setTimeout(self.createMaster, wait);
            } else { // send
                _.each(_.values(cache), function(translation) {
                    self._createMaster(translation.namespace, translation.key, function() {
                        var args = arguments;
                        _.each(translation.callbacks, function(done) {
                            done.call(args);
                        });
                    });
                });
                cache = {};
            }
            lastCallDate = new Date();
        };
    };

    return AjaxTranslationHandler;
});
