var mongoose = require("mongoose"),
    url = require('url');

require("./I18nSchema");

module.exports = function (options) {
    var regex = {
            ui: /^\/i18nAdmin/,
            handle: (options && options.nlsPath !== undefined)
                ? new RegExp("^\/" + options.nlsPath.replace(/^\/|\/$/g, '').replace(/\//g, '\\/') + "\/.*$")
                : /^\/nls\/.*$/
        },
        parser = require("./parser"),
        ui = require("./ui"),
        I18n = mongoose.model("I18n");

    if (!options || !options.templatePath) {
        throw "No template path given"
        return;
    }

    if (!options.nativeLanguage) {
        options.nativeLanguage = "en"
    }

    mongoose.connect((options && options.mongoConnect) ? options.mongoConnect : "mongodb://localhost/i18n", function () {
        parser.parse(options);
    });

    function send (res, locale) {
        res.end("define(" + JSON.stringify(locale) + ");");
    };

    return function (req, res, next) {
        var pathName = url.parse(req.url).pathname,
            locale = {};

        if ('GET' != req.method.toUpperCase() && 'PUT' != req.method.toUpperCase() && 'POST' != req.method.toUpperCase() && 'HEAD' != req.method.toUpperCase()) {
            return next();
        }

        if (options.enableUI && options.enableUI === true && regex.ui.test(pathName)) {
            return ui(req, res, options);
        }

        if (regex.handle.test(pathName)) {
            res.set('Content-Type', 'application/javascript');

            I18n.findOne({path: pathName}).populate("content").exec(function (err, i18n) {
                if (!err && i18n != null) {
                    if (i18n.get("root") === true) {
                        locale.root = {};

                        i18n.get("content").forEach(function (string) {
                            locale.root[string.get("key")] = string.get("value");
                        });

                        I18n.find({
                            path: new RegExp("^\/nls/.*?\/" + pathName.replace("/nls/", "") + "$")
                        }, function (err, docs) {
                            if (!err && i18n != null) {
                                for (var i in docs) {
                                    locale[docs[i].get("locale")] = true;
                                }
                            }

                            send(res, locale);
                        });
                    } else {
                        locale = i18n.get("content");
                        send(res, locale);
                    }
                } else {
                    return next();
                }
            });
        } else {
            return next();
        }
    }
};