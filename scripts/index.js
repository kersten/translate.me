var util = require('util'),
    _ = require('underscore'),
    async = require('async'),
    optimist = require('optimist'),
    TranslationIndex = require('../lib/server/parser/TranslationIndex');

var argv = optimist.usage("Creates a translation index from mustache and javascript files, based on the passed source directories.\nUsage: $0")
    .options('source', {
        string: true,
        demand: true,
        describe: "One or more directories to parse translations from."
    })
    .options('root', {
        string: true,
        default: process.cwd(),
        describe: "Root directory of the project folder. Default is the current working directory."
    })
    .argv;

var sources = [],
    root = argv.root;

async.waterfall([
    function(done) {
        sources = _.flatten([argv.source]);
        done();
    },
    function(done) {
        var index = new TranslationIndex();

        async.eachSeries(sources, function(source, done) {
            index.build(source, root, function(err, translations) {
                var grouped;
                if(!err && translations) {
                    grouped = _.groupBy(translations, function(translation) { return translation.sources; });
                    _.each(grouped, function(translations, sources) {
                        var namespaces = _.groupBy(translations, function(translation) {return translation.namespace; });

                        console.log(sources);
                        _.each(namespaces, function(translations, namespace) {
                            console.log('+', namespace);
                            _.each(translations, function(translation) {
                                console.log(' -', translation.key);
                            });
                        });
                        console.log();
                    });
                }
                done(err);
            });
        }, done);
    },
], function() {
    process.exit();
});
