define(['./lib/public/ajax-translations-handler.amd.js', './lib/handlebars-helpers.umd.js', './lib/translator.umd.js'],
    function(AjaxTranslationHandler, Helpers, Translator) {
    'use strict';

    return {
        AjaxTranslationHandler: AjaxTranslationHandler,
        Helpers: Helpers,
        Translator: Translator
    }
});
