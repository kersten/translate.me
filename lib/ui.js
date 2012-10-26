(function () {
    "use strict";

    var fs = require("fs"),
        hogan = require("hogan.js"),
        url = require("url");

    var paths = {
        css: /^\/i18nAdmin\/css/,
        js: /^\/i18nAdmin\/js/,
        strings: /^\/i18nAdmin\/strings/,
        paths: /^\/i18nAdmin\/paths/
    };

    function UI (req, res, db) {
        var URL = url.parse(req.url),
            i18n = db.model("I18n"),
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

            if (req.method.toUpperCase() == "POST") {
                var body = '';
                req.on('data', function (data) {
                    body += data;
                });
                req.on('end', function () {

                    var params = JSON.parse(body);

                    i18n.findOne({path: (params.path || "")}, function (err, doc) {
                        if (!doc) {
                            res.send(JSON.stringify([]));
                            return;
                        }

                        doc.get("content")[params.key] = params.value;

                        doc.save(function () {
                            return res.send(JSON.stringify({success: true}));
                        });
                    });
                });

                return;
            }

            i18n.findOne({path: (req.query["path"] || "")}, function (err, doc) {
                if (!doc) {
                    res.send(JSON.stringify({path: "", strings: []}));
                    return;
                }

                res.send(JSON.stringify({path: doc.get("path"), strings: doc.get("content")}));
            });

            return;
        } else if (paths.paths.test(URL.pathname)) {
            // JS File
            res.set('Content-Type', 'application/json');

            i18n.find({root: true}, function (err, doc) {
                res.send(JSON.stringify(doc));
            });

            return;
        } else {
            template = fs.readFileSync(__dirname + "/../templates/index.mustache").toString();
        }

        res.send(hogan.compile(template).render());
    }

    module.exports = UI;
}());