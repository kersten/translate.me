var async = require("async"), _ = require("underscore")._,fs = require("fs"), re = /\{\{i18n(?!\}|$)[^\}"]*(("[^"]*")[^\}"]*)*[^\}"]?\}\}/g;

/*while (matches = re.match(fs.readFileSync("../MHP/V-INFO/usr/lib/modules/Home/templates/Index.mustache").toString())) {
    console.log(matches[1]);
}*/

match = fs.readFileSync("../MHP/V-INFO/usr/lib/modules/Home/templates/Index.mustache").toString().match(re);

async.map(_.uniq(match), function (placeholder, cb) {
    var namespace = "default", value = "", re = /("((\\.|[^\\"])*[^\"]*?)")/g;

    placeholder = placeholder.replace("^{{i18n", "").replace("}}$", "").match(re);

    _.each(placeholder, function (key, i) {
        key = key.replace(/^"/, "").replace(/"$/, "");

        if (i > 1) {
            return;
        }

        if (placeholder.length !== 1 && i === 0) {
            namespace = key;
            return;
        }

        value = key;
    });

    console.log("namespace: " + namespace, "key: " + value);

    cb(null)
}, function () {

});
