var Handlebars = require("handlebars"),
    _ = require("underscore")._,
    fs = require("fs"),
    traverse = require("traverse"),
    data, helpers, translationStatements = [];

Handlebars.registerHelper("translation", function(options) {
    var key = options.hash.key,
        namespace;

    if(!key) {
        throw "Invalid translation statement! Argument 'key' is missing!";
    }

    if(options.hash && options.hash.namespace !== undefined) {
        namespace = options.hash.namespace;
    } else if(options.data && options.data.namespace !== undefined) {
        namespace = options.data.namespace;
    } else {
        namespace = "";
    }

    return '<translation namespace="' + namespace + '">' + key + '</translation>';
});

Handlebars.registerHelper("namespace", function(options) {
    var namespace = options.hash.name || ""
    return options.fn(this, {data: {namespace: namespace }});
});

data = fs.readFileSync("test.mustache");
console.log(new Handlebars.JavaScriptCompiler().compile(new Handlebars.Compiler().compile(Handlebars.parse(data.toString()), {})));

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
            namespace = parseNamespaceFromBlockStatement(statement);
            if(statement.program && statement.program.statements) {
                _.each(statement.program.statements, function(s) {
                    translations = translations.concat(parseStatement(s, namespace));
                });
            }
            break;
        case 'mustache':
            translation = parseTranslationFromMustacheStatement(statement, namespace);
            if(!translation.key) {
                throw "Invalid translation statement. Translation doesn't contain a valid \"key\" attribute.";
            } else {
                translations.push(translation);
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

function parseNamespaceFromBlockStatement(statement) {
    if(statement.mustache && statement.mustache.id && statement.mustache.id.string
        && statement.mustache.id.string === 'namespace') {
        return getAttr(statement.mustache.hash, 'name');
    }
}

function getAttr(hash, name) {
    var result;
    if(hash.pairs) {
        result = _.find(hash.pairs, function(pair) {
            return pair[1].type === 'STRING' && name === pair[0];
        });
        if(result !== undefined) {
            return result[1].string;
        }
    }
}
