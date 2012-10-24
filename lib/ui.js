(function () {
    "use strict";

    var fs = require("fs"),
        hogan = require("hogan.js"),
        url = require("url");

    var paths = {
        css: /^\/i18nAdmin\/css/,
        js: /^\/i18nAdmin\/js/,
        strings: /^\/i18nAdmin\/strings/
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
            // JS File
            res.set('Content-Type', 'application/json');

            i18n.findOne({path: "/nls/start"}, function (err, doc) {
                res.send(JSON.stringify(doc.toJSON()));
            });

            return;
        } else {
            template = fs.readFileSync(__dirname + "/../templates/index.mustache").toString();
        }

        res.send(hogan.compile(template).render());
    }

    module.exports = UI;
}());