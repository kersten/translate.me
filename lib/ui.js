(function () {
    "use strict";

    var fs = require("fs"),
        hogan = require("hogan.js"),
        mongoose = require("mongoose"),
        url = require("url");

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
            res.set('Content-Type', 'text/css');

            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else if (paths.js.test(URL.pathname)) {
            // JS File
            res.set('Content-Type', 'application/javascript');

            template = fs.readFileSync(__dirname + "/.." + URL.pathname.replace("/i18nAdmin", "")).toString();
        } else if (paths.strings.test(URL.pathname)) {
            res.set('Content-Type', 'application/json');

            if (req.method.toUpperCase() == "PUT") {
                var body = '';

                req.on('data', function (data) {
                    body += data;
                });

                req.on('end', function () {
                    var params = JSON.parse(body);

                    i18nString.findById(params._id, function (err, doc) {
                        if (!doc) {
                            res.send(JSON.stringify([]));
                            return;
                        }

                        doc.set({
                            value: params.value
                        });

                        doc.save(function () {
                            return res.send(JSON.stringify({success: true}));
                        });
                    });
                });

                return;
            }

            if (req.method.toUpperCase() == "POST") {
                var body = '';

                req.on('data', function (data) {
                    body += data;
                });

                req.on('end', function () {
                    var params = JSON.parse(body),
                        string = new i18nString();

                    string.set({
                        locale: params.locale,
                        path: params.path,
                        key: params.key,
                        value: params.value
                    });

                    string.save(function (err, string) {
                        i18n.findOne({path: params.path, locale: params.locale}).populate('content').exec(function (err, doc) {
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
                                doc.get("content").push(string);
                                doc.save(function () {
                                    res.send(string.toJSON());
                                })
                            }
                        });
                    });
                });

                return;
            }

            i18n.findOne({path: (req.query["path"] || ""), locale: (req.query["locale"] || options.nativeLanguage)}).populate('content').exec(function (err, doc) {
                console.log(arguments);

                if (!doc) {
                    i18n.findOne({path: (req.query["path"] || "")}).populate('content').exec(function (err, doc) {
                        var keys = [];

                        doc.get("content").forEach(function (string) {
                            keys.push({key: string.get("key"), value: ""});
                        });



                        res.send(JSON.stringify({
                            locale: req.query["locale"],
                            path: doc.get("path"),
                            strings: keys
                        }));
                    });
                    return;
                }

                console.log("NULL", doc);

                res.send(JSON.stringify({path: doc.get("path"), strings: doc.get("content")}));
            });

            return;
        } else if (paths.paths.test(URL.pathname)) {
            // JS File
            res.set('Content-Type', 'application/json');

            i18n.find({root: true}).populate('content').exec(function (err, doc) {
                res.send(JSON.stringify(doc));
            });

            return;
        } else if (paths.list.test(URL.pathname)) {
            res.set('Content-Type', 'application/json');

            res.send(JSON.stringify(require("./code-list")));

            return;
        } else {
            template = fs.readFileSync(__dirname + "/../templates/index.mustache").toString();
        }

        res.send(hogan.compile(template).render());
    }

    module.exports = UI;
}());