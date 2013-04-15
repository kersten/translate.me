var TranslateMe = new require("./lib/server/TranslateMe"),
    translateMe;

module.exports = function(options) {
    if(!translateMe && options) {
        translateMe = new TranslateMe(options.mongoURL, options.defaultLocale, options.supportedLocales);
    } else if(!translateMe && !options) {
        throw new Error("Please pass an options object to initialize translate.me");
    } else if(translateMe && options) {
        throw new Error("Please do not pass options! Translate.me has been initialized before.");
    }
    return translateMe;
}
