var _ = require('underscore')._,
    esprima = require('esprima'),
    traverse = require("traverse");

module.exports = function(content) {
    'use strict';

    var syntax = esprima.parse(content),
        translations = [];

    traverse(syntax).forEach(function(node) {
        var translation = {
                namespace: "", // Default namespace
                origin: 'static'
            },
            keyArgument, namespaceOrContextArgument;

        if(node && node.type === "CallExpression" && node.callee && node.callee.type === "MemberExpression"
            && node.callee.property.name === "translate" && node.arguments.length > 0) {
            keyArgument = node.arguments[0];
            if(keyArgument && keyArgument.type === 'Literal') {
                translation.key = keyArgument.value;
                if(node.arguments.length > 1) {
                    namespaceOrContextArgument = node.arguments[1];
                    if(namespaceOrContextArgument && namespaceOrContextArgument.type === 'Literal') {
                        translation.namespace = namespaceOrContextArgument.value;
                    }
                }
                translations.push(translation);
            }
        }
    });

    return translations;
}
