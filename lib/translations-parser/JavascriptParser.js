var _ = require('underscore')._,
    esprima = require('esprima'),
    traverse = require("traverse");

module.exports = function(content) {
    var syntax = esprima.parse(content),
        translations = [];

    traverse.map(syntax, function(node) {
        var translation = {};
        if(node && node.type === "CallExpression" && node.callee && node.callee.type === "MemberExpression"
            && node.callee.object.name === "_" && node.callee.property.name === "translate") {
            translation.key = node.arguments[0];
            if(_.isString(translation.key) && translation.key.length > 0) {
                if(_.isString(node.arguments[1]) && node.arguments[1].length > 0) {
                    translation.namespace = node.arguments[1];
                } else {
                    translation.namespace = "";
                }
                translations.push(translation);
            }
        }
    });

    return translations;
}
