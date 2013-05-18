var Handlebars = require("handlebars"),
    _ = require("underscore")._;

module.exports = function(content) {
    return parseStatement(Handlebars.parse(content));
}

function parseStatement(statement, namespace) {
    var translations = [],
        translation;

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
            if(statement.program) {
                if(statement.program.statements) {
                    _.each(statement.program.statements, function(s) {
                        translations = translations.concat(parseStatement(s, namespace));
                    });
                }
                if(statement.program.inverse && statement.program.inverse.type
                    && statement.program.inverse.type === 'program'
                    && statement.program.inverse.statements) {
                    _.each(statement.program.inverse.statements, function(s) {
                        translations = translations.concat(parseStatement(s, namespace));
                    });
                }
            }
            break;
        case 'mustache':
            translation = parseTranslationFromMustacheStatement(statement, namespace);
            if(translation) {
                if(!translation.key) {
                    throw "Invalid translation statement. Translation doesn't contain a valid \"key\" attribute.";
                } else {
                    translations.push(translation);
                }
            }
            break;
    }

    return translations;
}

function parseTranslationFromMustacheStatement(statement, namespace) {
    var ns;

    if(statement.id && statement.id.string === 'translation') {
        ns = getAttr(statement.hash, 'namespace');
        if(ns !== undefined) {
            namespace = ns;
        }
        return {
            key: getAttr(statement.hash, 'key'),
            namespace: namespace
        };
    }
}

function getAttr(hash, name) {
    var result;
    if(hash && hash.pairs) {
        result = _.find(hash.pairs, function(pair) {
            return pair[1].type === 'STRING' && name === pair[0];
        });
        if(result !== undefined) {
            return result[1].string;
        }
    }
}
