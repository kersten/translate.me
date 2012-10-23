var fs = require("fs"),
    walk = require("walk");

module.exports = (function () {
    var i18n = {};

    function extract (root, file, options, cb) {
        fs.readFile(root + "/" + file, function (err, data) {
            var placeholders = data.toString().match(/\{\{\#i18n\}\}(.*?)\{\{\/i18n\}\}/ig);

            if (placeholders) {
                placeholders.forEach(function (placeholder) {
                    var path = "/nls" + root.replace(options.templatePath, "/") + file.replace(/.[^.]+$/, "");

                    if (i18n[path] === undefined) {
                        i18n[path] = [];
                    }

                    i18n[path].push(placeholder.replace("{{#i18n}}", "").replace("{{/i18n}}", ""));
                });
            }

            cb();
        });
    }

    this.parse = function (options, cb) {
        var walker;

        if (!options || !options.templatePath) {
            console.log("No template path given");
            return;
        }

        walker = walk.walk(options.templatePath);

        walker.on("file", function (root, fileStats, next) {
            fs.watch(root + "/" + fileStats.name, function () {
                extract(root, fileStats.name, options, function () {
                    next();
                });
            });

            extract(root, fileStats.name, options, function () {
                next();
            });
        });

        walker.on('directory', function (root, stat, next) {
            //walker.walk(root);
            next();
        });

        walker.on("end", function () {
            console.log(i18n);

            if (typeof cb === "function") {
                cb();
            }
        });
    };

    return this;
})();