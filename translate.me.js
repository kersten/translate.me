define(['lib/public/ajax-translations-handler.amd', 'lib/handlebars-helpers.umd', 'lib/translator.umd'],
    function(AjaxTranslationHandler, Helpers, Translator) {
    'use strict';

    return {
        AjaxTranslationHandler: AjaxTranslationHandler,
        Helpers: Helpers,
        Translator: Translator
    }
});
