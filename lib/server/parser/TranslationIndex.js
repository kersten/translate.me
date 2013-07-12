var async = require('async'),
    dive = require('dive'),
    fs = require('fs'),
    mime = require('mime'),
    Path = require('path'),
    _ = require('underscore')._,
    parseAngularFile = require('./AngularParser'),
    parseHandlebarsFile = require('./HandlebarsParser'),
    parseJavascriptFile = require('./JavascriptParser');

function TranslationIndex(){
}

TranslationIndex.prototype.read = function(path, done) {
    var self = this;

    if(typeof path !== 'string') {
        throw new TypeError("Cannot extract translations. The passed path to the file to extract is not a string. ");
    }

    fs.readFile(path, function(err, data) {
        if(!err) {
            done(null, self.parse(data.toString(), mime.lookup(path)));
        } else {
            done(err);
        }
    });
};

TranslationIndex.prototype.parse = function(data, mimeType) {
    if(typeof data !== 'string') {
        throw new TypeError("Cannot parse translations. The argument data must be a string.");
    }
    if(typeof mimeType !== 'string') {
        throw new TypeError("Cannot parse translations. The argument mimeType must be a string.");
    }

    var translations = [];

    switch(mimeType) {
        case 'text/angular':
            translations = parseAngularFile(data);
            break;
        case 'text/mustache':
        case 'text/handlebars':
            translations = parseHandlebarsFile(data);
            break;
        case 'application/javascript':
            translations = parseJavascriptFile(data);
            break;
    }

    return translations;
};

/**
 * Builds a translation index for the passed directory. Recursively dives into each sub-directory of the passed directory.
 *
 * @param directory {String} path to a directory to build a translation index for, never null
 * @param projectDirectory {String} path to the root directory of your project to create translations in, never null
 * @param mimeTypes {Object} mapping of file extensions to mime types
 * @param done {function(object, object[])} which will be called when the index has been created. Receives an error object
 * and a array of translations.
 */
TranslationIndex.prototype.build = function(directory, projectDirectory, mimeTypes, done) {
    var self = this,
        files = [];

    mime.define(mimeTypes);

    dive(Path.normalize(directory), function (err, file) {
        if (!err) {
            files.push(file);
        } else {
            done(err);
        }
    }, function() {
        async.map(files, function(file, done) {
            self.read(file, function(err, translations) {
                if(!err) {
                    _.each(translations, function(translation) {
                        translation.sources = [Path.relative(projectDirectory, file)];
                    });
                    done(null, translations);
                } else {
                    done(err);
                }
            });
        }, function(err, results) {
            if(!err) {
                done(null, _.flatten(results));
            } else {
                done(err);
            }
        });
    });
}

module.exports = TranslationIndex;
