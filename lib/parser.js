var fs = require("fs"),
    walk = require("walk");

module.exports = (function () {
    this.parse = function (options, cb) {
        var walker, i18n = {};

        if (!options || !options.templatePath) {
            console.log("No template path given");
            return;
        }

        walker = walk.walk(options.templatePath, { followLinks: false });

        walker.on("file", function (root, fileStats, next) {
            fs.readFile(root + "/" + fileStats.name, function (err, data) {
                var placeholders = data.toString().match(/\{\{\#i18n\}\}(.*?)\{\{\/i18n\}\}/ig);

                if (placeholders) {
                    placeholders.forEach(function (placeholder) {
                        var path = "/nls" + root.replace(options.templatePath, "/") + fileStats.name.replace(/.[^.]+$/, "");

                        if (i18n[path] === undefined) {
                            i18n[path] = [];
                        }

                        i18n[path].push(placeholder.replace("{{#i18n}}", "").replace("{{/i18n}}", ""));
                    });
                }

                next();
            });
        });

        walker.on('directory', function (path, stat, next) {
            console.log( [path, '/', stat.name].join('') )
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