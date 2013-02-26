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
            _.each(node.arguments, function(argument) {
                if((!translation.key || !translation.namespace) && argument.type === "Literal") {
                    if(argument.value.substring(0, 3) === 'ns:') {
                        translation.namespace = argument.value.substring(3);
                    } else if(argument.value.indexOf(':') < 0) {
                        translation.key = argument.value;
                    }
                }
            })
            translations.push(translation);
        }
    });

    return translations;
}
