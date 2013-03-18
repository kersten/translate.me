var express = require('express'),
    app = express(),
    TranslateMe = require('../lib/TranslateMe');

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use('/js/underscore', express.static(__dirname + '/../node_modules/underscore/'));
app.use('/translate.me', express.static(__dirname + '/../lib/browser'));

/*
 * Create a new TranslateMe object which connects to '', has a default locale of 'en'
 * and furthermore supports the locales 'de' and 'fr'.
 */
translateMe = new TranslateMe('mongodb://localhost/i18n_example', 'en', ['de', 'fr']);

/*
 * Add paths that contains files with translations
 */
translateMe.generateDefaultTranslations([
    path.join(__dirname, "views")
]);

/*
 * Overwrite getLocale function, to enable custom selection of the current locale.
 */
translateMe.getLocale = function(req, callback) {
    callback('de');
}

/*
 * It is imported to place the 'reqister routers' after
 * all use-statements, to prevent any blockage of other middlewares.
 */
translateMe.registerRoutes(app, true);

app.get('/', function(req, res){
    res.sendfile(__dirname + '/views/index.html');
});

app.listen(8080);
console.log('Listening on port 8080');
