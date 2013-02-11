var async = require("async"), _ = require("underscore")._,fs = require("fs"), re = /_\.translate\((.|[\r\n])*?((\\.|[^\\"])*?)\);/g;

/*while (matches = re.match(fs.readFileSync("../MHP/V-INFO/usr/lib/modules/Home/templates/Index.mustache").toString())) {
    console.log(matches[1]);
}*/

match = fs.readFileSync("/Users/burkhardt/Developing/MHP/V-INFO/usr/lib/modules/Account/views/UsersAndGroups/AccessManagement.js").toString().match(re);

console.log(match);

async.map(_.uniq(match), function (placeholder, cb) {
    var namespace = "default", key = "", re = /"(.|[\r\n])*?((\\.|[^\\"])*[^\"]*?)"/g;
    placeholder = placeholder.match(re);

    if (placeholder.length > 1 && placeholder[0].replace(/^\"/, "").replace(/\"$/, "").substr(0, 3) === "ns:") {
        namespace = placeholder[0].replace(/^\"/, "").replace(/\"$/, "");
        key = placeholder[1].replace(/^\"/, "").replace(/\"$/, "");
    } else if (placeholder.length > 1 && placeholder[1].replace(/^\"/, "").replace(/\"$/, "").substr(0, 3) === "ns:") {
        namespace = placeholder[1].replace(/^\"/, "").replace(/\"$/, "");
        key = placeholder[0].replace(/^\"/, "").replace(/\"$/, "");
    } else {
        key = placeholder[0].replace(/^\"/, "").replace(/\"$/, "");
    }

    console.log("result: ", namespace, key);
});

process.exit();

console.log(_.uniq(match));

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
