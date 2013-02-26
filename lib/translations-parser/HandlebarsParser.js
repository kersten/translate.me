var Handlebars = require("handlebars"),
    _ = require("underscore")._;

module.exports = function(content) {
    return parseStatement(Handlebars.parse(content));
}

function parseStatement(statement, namespace) {
    var translations = [],
        localNamespace;

    if(namespace === undefined) {
        namespace = "";
    }

    switch(statement.type) {
        case 'program':
            if(statement.statements) {
                _.each(statement.statements, function(s) {
                    translations = translations.concat(parseStatement(s, namespace));
                });
            }
            break;
        case 'block':
            if(statement.mustache && statement.mustache.id && statement.mustache.id.string
                && statement.mustache.id.string === 'namespace') {
                namespace = getAttr(statement.mustache.hash, 'name');
            }
            if(statement.program && statement.program.statements) {
                _.each(statement.program.statements, function(s) {
                    translations = translations.concat(parseStatement(s, namespace));
                });
            }
            break;
        case 'mustache':
            if(statement.id && statement.id.string === 'translation') {
                localNamespace = getAttr(statement.hash, 'namespace');
                if(localNamespace !== undefined) {
                    namespace = localNamespace;
                }
                translations.push({
                    key: getAttr(statement.hash, 'key'),
                    namespace: namespace
                });
            }
            break;
    }

    return translations;
}

function getAttr(hash, name) {
    var pair;
    if(hash && hash.pairs) {
        pair = _.find(hash.pairs, function(pair) {
            return pair[1].type === 'STRING' && name === pair[0];
        });
        if(pair !== undefined) {
            return pair[1].string;
        }
    }
}
