var dive = require('dive'),
    fs = require('fs'),
    mime = require('mime'),
    Path = require('path'),
    _ = require('underscore')._,
    parseHandlebarsFile = require('./HandlebarsParser'),
    parseJavascriptFile = require('./JavascriptParser'),
    mongoose = require("mongoose"),
    TranslationModel = mongoose.model("translation", require('../TranslationSchema')),
    Parser;

mime.define({
    'text/handlebars': ['hbs', 'handlebars', 'handlebar'],
    'text/mustache': ['mustache']
});

function extract(file, root) {
    if(typeof file !== 'string') {
        throw new TypeError("Cannot extract translations. The passed path to the file to extract is not a string. ");
    }
    if(typeof root !== 'string') {
        throw new TypeError("Cannot extract translations. The passed path of the root directory is not a string.");
    }

    fs.readFile(file, function (err, data) {
        var translations,
            type = mime.lookup(file);

        if(type === 'text/handlebars' || type === 'text/mustache') {
            try {
                translations = parseHandlebarsFile(data.toString());
            } catch (err) {
                // TODO proper log
                console.log("Could not extract translations from: " + file + ". Exception:\n" + err);
            }
        } else if (type === 'application/javascript') {
            translations = parseJavascriptFile(data.toString());
        }

        _.each(translations, function(translation) {
            if(translation.key) {
                TranslationModel.getTranslationModel({
                    key: translation.key,
                    namespace: translation.namespace,
                    sources: [Path.relative(root, file)]
                }, function(err, model) {
                    if(!err && model) {
                        model.save();
                    } else {
                        // TODO log error!
                        console.log("Could not create new translation.", err);
                    }
                })
            }
        });
    });
}

module.exports = {
    parse: function(paths, callback) {
        TranslationModel.ensureIndexes(function(err) {
            if(!err) {
                paths.forEach(function (path) {
                    path = Path.normalize(path);
                    dive(path, function (err, file) {
                        if (!err) {
                            extract(file, path);
                        }
                    }, callback);
                });
            } else {
                // TODO proper logging
                console.log(err);
            }
        });
    }
};
