var _ = require('underscore')._,
    esprima = require('esprima'),
    traverse = require("traverse");

module.exports = function(content) {
    'use strict';

    var syntax = esprima.parse(content),
        translations = [];

    traverse(syntax).forEach(function(node) {
        var translation, keyOrOptionsArgument, namespaceOrContextArgument;

        if(node && node.type === "CallExpression" && node.callee && node.callee.type === "MemberExpression"
            && node.callee.property.name === "translate" && node.arguments.length > 0) {
            keyOrOptionsArgument = node.arguments[0];
            if(keyOrOptionsArgument) {
                if(keyOrOptionsArgument.type === 'Literal' && keyOrOptionsArgument.value) { // Multiple arguments
                    translation = {
                        key: keyOrOptionsArgument.value,
                        namespace: ""
                    };
                    if(node.arguments.length > 1) {
                        namespaceOrContextArgument = node.arguments[1];
                        if(namespaceOrContextArgument && namespaceOrContextArgument.type === 'Literal') {
                            translation.namespace = namespaceOrContextArgument.value;
                        }
                    }
                    translations.push(translation);
                } else if(keyOrOptionsArgument.type === 'ObjectExpression') { // Options object
                    if(keyOrOptionsArgument.properties && keyOrOptionsArgument.properties.length > 0) {
                        _.each(keyOrOptionsArgument.properties, function(propertyNode) {
                            if(propertyNode.type === 'Property' && propertyNode.key && propertyNode.value
                                && propertyNode.key.type === 'Identifier' && propertyNode.value.type === 'Literal') {
                                if(!translation) {
                                    translation = {
                                        namespace: ""
                                    };
                                }
                                switch(propertyNode.key.name) {
                                    case 'key':
                                        translation.key = propertyNode.value.value;
                                        break;
                                    case 'namespace':
                                        translation.namespace = propertyNode.value.value;
                                        break;
                                }
                            }
                        });
                        if(translation && translation.key) { // Omit when key is empty
                            translations.push(translation);
                        }
                    }
                }
            }
        }
    });

    return translations;
}

/*{
    "type": "ObjectExpression",
    "properties": [
    {
        "type": "Property",
        "key": {
            "type": "Identifier",
            "name": "key"
        },
        "value": {
            "type": "Literal",
            "value": "Test",
            "raw": "\"Test\""
        },
        "kind": "init"
    },
    {
        "type": "Property",
        "key": {
            "type": "Identifier",
            "name": "namespace"
        },
        "value": {
            "type": "Literal",
            "value": "a",
            "raw": "\"a\""
        },
        "kind": "init"
    }
]
}*/
