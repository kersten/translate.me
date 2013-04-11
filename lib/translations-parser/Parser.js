var dive = require('dive'),
    fs = require('fs'),
    mime = require('mime'),
    Path = require('path'),
    _ = require('underscore')._,
    parseHandlebarsFile = require('./HandlebarsParser'),
    parseJavascriptFile = require('./JavascriptParser'),
    Parser;

mime.define({
    'text/handlebars': ['hbs', 'handlebars', 'handlebar'],
    'text/mustache': ['mustache']
});

Parser = function (translationStore) {
    this.translationStore = translationStore;
}

Parser.prototype.extract = function(file, defaultLocale) {
    var self = this;
    if(file && defaultLocale) {
        fs.readFile(file, function (err, data) {
            var translations,
                type = mime.lookup(file);

            if(type === 'text/handlebars' || type === 'text/mustache') {
                try {
                    translations = parseHandlebarsFile(data.toString());
                } catch (err) {
                    console.log("Could not extract translations from: " + file + ". Exception:\n" + err);
                }
            } else if (type === 'application/javascript') {
                translations = parseJavascriptFile(data.toString());
            }

            _.each(translations, function(translation) {
                var data = {};

                if(translation.key) {
                    data.key = translation.key;
                    data.locale = defaultLocale;
                    data.namespace = translation.namespace;
                    data.origin = translation.origin;

                    self.translationStore.createMetaTranslation(data);
                }
            });
        });
    }
}

Parser.prototype.parse = function(paths, locale, callback) {
    var self = this;
    this.translationStore.ready(function() {
        paths.forEach(function (path) {
            path = Path.normalize(path);

            dive(path, function (err, file) {
                if (!err) {
                    self.extract(file, locale);
                }
            }, callback);
        });
    });
};

module.exports = Parser;
