var mongoose = require("mongoose"),
    I18nSchema = require("./I18nSchema"),
    parser = require("./parser"),
    ui = require("./ui"),
    url = require('url');

module.exports = function (options) {
    var regex = {
            ui: /^\/i18nAdmin/,
            handle: (options && options.nlsPath !== undefined)
                ? new RegExp("^\/" + options.nlsPath.replace(/^\/|\/$/g, '').replace(/\//g, '\\/') + "\/.*$")
                : /^\/nls\/.*$/
        }, db = mongoose.createConnection((options && options.mongoConnect) ? options.mongoConnect : "mongodb://localhost/i18n"),
        I18n = db.model("I18n", I18nSchema);

    if (!options || !options.templatePath) {
        throw "No template path given"
        return;
    }

    parser.parse({
        templatePath: options.templatePath,
        db: db
    });

    function send (res, locale) {
        res.end("define(" + JSON.stringify(locale) + ");");
    };

    return function (req, res, next) {
        var pathName = url.parse(req.url).pathname,
            locale = {};

        if ('GET' != req.method.toUpperCase() && 'HEAD' != req.method.toUpperCase()) {
            console.log(req.method.toUpperCase(), pathName);

            return next();
        }

        if (options.enableUI && options.enableUI === true && regex.ui.test(pathName)) {
            return ui(req, res, db);
        }

        if (regex.handle.test(pathName)) {
            res.set('Content-Type', 'application/javascript');

            I18n.findOne({path: pathName}, function (err, i18n) {
                if (!err && i18n != null) {
                    if (i18n.get("root") === true) {
                        locale.root = i18n.get("content");

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