(function () {
    "use strict";

    var fs = require("fs"),
        hogan = require("hogan.js"),
        mongoose = require("mongoose"),
        url = require("url"),
        _ = require("underscore")._;

    var paths = {
        css: /^\/i18nAdmin\/css/,
        js: /^\/i18nAdmin\/js/,
        strings: /^\/i18nAdmin\/strings/,
        paths: /^\/i18nAdmin\/paths/,
        list: /^\/i18nAdmin\/cclist/
    };

    function UI (req, res, options) {
        var URL = url.parse(req.url),
            i18nString = mongoose.model("I18nString"),
            template;

        if (paths.strings.test(URL.pathname)) {
            res.set("Content-Type", "application/json");

            // UPDATE
            if (req.method.toUpperCase() == "PUT") {
                var params = req.body;

                i18nString.findById(params._id, function (err, doc) {
                    if (!doc) {
                        res.send(JSON.stringify([]));
                        return;
                    }

                    doc.set({
                        value: params.value
                    });

                    doc.save(function () {
                        console.log(arguments);
                        return res.send(JSON.stringify({success: true}));
                    });
                });

                return;
            }

            // CREATE
            if (req.method.toUpperCase() == "POST") {
                var params = req.body,
                    string = new i18nString();

                string.set({
                    locale: params.locale,
                    path: params.path,
                    key: params.key,
                    value: params.value
                });
                string.save();

                return;
            }

            i18nString.find({path: req.query["path"], locale: req.query["locale"]}).populate("content").exec(function (err, doc) {
                var strings = {}, keys = [];

                if (doc) {
                    doc.get("content").forEach(function (obj) {
                        strings[obj.get("key")] = obj.toJSON();
                    });
                }

                _.each(strings, function (obj) {
                    keys.push(obj);
                });

                res.send(JSON.stringify({
                    locale: req.query["locale"],
                    path: req.query["path"],
                    strings: keys
                }));
            });

            return;
        } else if (paths.paths.test(URL.pathname)) {
            // JS File
            res.set("Content-Type", "application/json");

            i18nString.distinct("path").exec(function (err, doc) {
                res.send(JSON.stringify(_(doc).sort("path")));
            });

            return;
        } else if (paths.list.test(URL.pathname)) {
            res.set("Content-Type", "application/json");

            res.send(JSON.stringify(require("./code-list")));

            return;
        } else if (paths.css.test(URL.pathname)) {
            // CSS File
            res.set("Content-Type", "text/css");
            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else if (paths.js.test(URL.pathname)) {
            // JS File
            res.set("Content-Type", "application/javascript");
            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else {
            // Frontend
            template = fs.readFileSync(__dirname + "/../templates/index.mustache").toString();
        }
        res.send(hogan.compile(template).render());
    }

    module.exports = UI;
}());
