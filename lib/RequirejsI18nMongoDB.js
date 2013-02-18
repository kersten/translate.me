var mongoose = require("mongoose"),
    _ = require("underscore")._;
    I18nStrings = require("./I18nSchema"),
    NlsMiddleware = require("./nls.middleware")
    createUIServices = require("./ui"),
    parser = require("./parser"),
    express = require("express");

/**
 * Creates a new RequirejsI18nMongoDB object.
 *
 * @param {String} mongoURL an URL of a mongo db to create the translations in
 * @param {String} locale a default country code which language the translations statements represent
 * @constructor
 */
RequirejsI18nMongoDB = function (mongoURL, locale) {
    if(!mongoURL) {
        throw "Please pass a mongo URL to connect to.";
    }
    if(!locale) {
        throw "Please pass a locale.";
    }
    this.locale = locale;

    mongoose.connect(mongoURL);
};

/**
 * Generates translations entries in a mongo-db, based on the translation statements in the files of the passed
 * directories. Currently supported are javascript and mustache files. The translation statements are as following:
 *
 * - .mustache: {{i18n "key" "ns:namespace"}}
 * - .js: _.translate("key", "ns:namespace", parameters);
 *
 * @public
 * @param {String|String[]} directories a directory or an array of directories where to search for translation statements
 * @param {Function} [callback] a function which will be called, when the operation finished
 */
RequirejsI18nMongoDB.prototype.generateDefaultTranslations = function(directories, callback) {
    if(!directories) {
        throw "Please pass a directory or list of directories to check for translation statements.";
    }
    var self = this;
    I18nStrings.ensureIndexes(function() {
        parser.parse(directories, self.locale, callback);
    });
}

/**
 * Registers the translation ui to the passed express app.
 *
 * @param app express app to register the translation ui to
 * @param {String} root a path, where the translation ui should reside in
 */
RequirejsI18nMongoDB.prototype.registerTranslationUI = function(app, root) {
    if(!app) {
        throw "Please pass an express app object.";
    }
    if(!root) {
        throw "Please pass a path where the ui should reside in.";
    }
    app.use(root, express.static(__dirname + "/../templates"));
    app.use(root + "/css", express.static(__dirname + "/../css"));
    app.use(root + "/js", express.static(__dirname + "/../js"));
    app.use(root + "/paths", function(req, res) {
        res.set("Content-Type", "application/json");
        I18nStrings.distinct("path").exec(function (err, docs) {
            var paths = [];
            _.each(docs, function(doc) {
                paths.push({
                    path: doc
                });
            });
            res.send(JSON.stringify(paths));
        });
    });
    createUIServices(app, root, this.locale);
}

/**
 * Registers the translation service to the passed express app.
 *
 * @param app express app to register the translation service to
 * @param {String} root a path, where the translation service should reside in
 */
RequirejsI18nMongoDB.prototype.registerTranslationService = function(app, root) {
    if(!app) {
        throw "Please pass an express app object.";
    }
    if(!root) {
        throw "Please pass a path where the translation service should reside in.";
    }
    app.use(root, new NlsMiddleware(this.locale));
}

module.exports = RequirejsI18nMongoDB;
