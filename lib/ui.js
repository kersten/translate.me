(function () {
    "use strict";

    var codeList = hogan = require("./code-list"),
        fs = require("fs"),
        hogan = require("hogan.js"),
        mongoose = require("mongoose"),
        url = require("url"),
        unify = require("junify"),
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
            i18n = mongoose.model("I18n"),
            i18nString = mongoose.model("I18nString"),
            template;

        if (paths.css.test(URL.pathname)) {
            // CSS File
            res.set("Content-Type", "text/css");

            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else if (paths.js.test(URL.pathname)) {
            // JS File
            res.set("Content-Type", "application/javascript");

            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else if (paths.strings.test(URL.pathname)) {
            res.set("Content-Type", "application/json");

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

            if (req.method.toUpperCase() == "POST") {
                var params = req.body,
                    string = new i18nString();

                string.set({
                    locale: params.locale,
                    path: params.path,
                    key: params.key,
                    value: params.value
                });

                i18nString.findOne({
                    locale: params.locale,
                    path: params.path,
                    key: params.key
                }, function (err, old) {
                    string.save(function (saveErr, string) {
                        i18n.findOne({path: params.path, locale: params.locale}).populate("content").exec(function (err, doc) {
                            var path;

                            if (!doc) {
                                path = new i18n();

                                path.set({
                                    locale: params.locale,
                                    path: params.path,
                                    root: false,
                                    content: [
                                        string
                                    ]
                                });

                                path.save(function () {
                                    res.send(string.toJSON());
                                });
                            } else {
                                if (saveErr) {
                                    old.set({
                                        value: params.value
                                    }).save(function () {
                                        doc.get("content").push(old);
                                        doc.save(function () {
                                            res.send(old.toJSON());
                                        });
                                    });
                                } else {
                                    doc.get("content").push(string);
                                    doc.save(function () {
                                        res.send(string.toJSON());
                                    })
                                }
                            }
                        });
                    });
                });

                return;
            }

            i18n.findOne({path: req.query["path"].replace("/nls/", "/nls/" + req.query["locale"] + "/"), locale: req.query["locale"]}).populate("content").exec(function (err, doc) {
                console.log(arguments);

                i18n.findOne({path: req.query["path"], root: true}).populate("content").exec(function (err, root) {
                    var strings = {}, keys = [];

                    root.get("content").forEach(function (obj) {
                        strings[obj.get("key")] = {
                            key: obj.get("key"),
                            value: obj.get("value")
                        };
                    });

                    if (doc) {
                        console.log(doc);

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

                //res.send(JSON.stringify({path: doc.get("path"), strings: doc.get("content")}));
            });

            return;
        } else if (paths.paths.test(URL.pathname)) {
            // JS File
            res.set("Content-Type", "application/json");

            i18n.find({root: true}).populate("content").exec(function (err, doc) {
                res.send(JSON.stringify(_(doc).sort("path")));
            });

            return;
        } else if (paths.list.test(URL.pathname)) {
            res.set("Content-Type", "application/json");

            res.send(JSON.stringify(require("./code-list")));

            return;
        } else {
            template = fs.readFileSync(__dirname + "/../templates/index.mustache").toString();
        }

        res.send(hogan.compile(template).render());
    }

    module.exports = UI;
}());
