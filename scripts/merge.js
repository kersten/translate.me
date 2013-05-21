var util = require('util'),
    _ = require('underscore')._,
    mongo = require('mongodb'),
    async = require('async'),
    optimist = require('optimist');

var argv = optimist.usage("Copies all translations from one database to another.\nUsage: $0")
        .options('s', {
            alias: 'source',
            string: true,
            demand: true,
            describe: "Mongo URL of the server to retrieve the translations from. mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database]"
        })
        .options('d', {
            alias: 'destination',
            string: true,
            demand: true,
            describe: "Mongo URL of the server to copy the translations to. mongodb://[username:password@]host1[:port1][,host2[:port2],...[,hostN[:portN]]][/[database]"
        })
        .options('c', {
            alias: 'collection',
            string: true,
            default: 'translations',
            description: "Name of the collection where the translations are stored in."
        })
        .options('p', {
            alias: 'property',
            string: true,
            description: "Property name to merge."
        })
        .argv;

async.waterfall([
    function(done) {
        util.print(util.format('Connecting to source database: "%s"...', argv.s));
        mongo.MongoClient.connect(argv.s, function(err, sourceDb) {
            if(!err) {
                util.print(' [Connected]\n');
            }
            done(err, sourceDb);
        });
    },
    function(sourceDb, done) {
        util.print(util.format('Selecting source collection: "%s"...', argv.c));
        sourceDb.collection(argv.c, function(err, translationsCol) {
            if(!err) {
                util.print(' [Selected]\n');
            }
            done(err, translationsCol);
        });
    },
    function(translationsCol, done) {
        util.print('Retrieving source translations...');
        translationsCol.find().toArray(function(err, translations) {
            if(!err) {
                util.print(util.format(' [Retrieved %d translations]\n', translations.length));
            }
            done(err, translations);
        });
    },
    function(translations, done) {
        if(translations.length <= 0) {
            done("There are no translations. I'll stop now.");
        } else {
            done(null, translations);
        }
    },
    function(translations, done) {
        util.print(util.format('Connecting to destination database: "%s"...', argv.d));
        mongo.MongoClient.connect(argv.d, function(err, destinationDb) {
            if(!err) {
                util.print(' [Connected]\n');
            }
            done(err, destinationDb, translations);
        });
    },
    function(destinationDb, translations, done) {
        util.print(util.format('Selecting destination collection: "%s"...', argv.c));
        destinationDb.collection(argv.c, function(err, translationsCol) {
            if(!err) {
                util.print(' [Selected]\n');
            }
            done(err, destinationDb, translationsCol, translations);
        });
    },
    function(destinationDb, destinationCol, sourceTranslations, done) {
        util.print('Retrieving translations...');
        destinationCol.find().toArray(function(err, translations) {
            if(!err) {
                util.print(util.format(' [Retrieved %d translations]\n', translations.length));
            }
            done(err, destinationCol, translations, sourceTranslations);
        });
    },
    function(destinationCol, destinationTranslations, sourceTranslations, done) {
        var mergedTranslations = [];

        util.print('Calculating merge...');
        _.each(destinationTranslations, function(destinationTranslation) {
            var sourceTranslation = _.find(sourceTranslations, function(sourceTranslation) {
                    return destinationTranslation.key === sourceTranslation.key
                        && destinationTranslation.namespace === sourceTranslation.namespace;
                }),
                mergedTranslation;

            if(sourceTranslation) {
                _.each(argv.p, function(property) {
                    if(_.has(sourceTranslation, property)) {
                        if(!mergedTranslation) {
                            mergedTranslation = {
                                _id: destinationTranslation._id
                            };
                        }
                        mergedTranslation[property] = sourceTranslation[property];
                    }
                });
            }

            if(mergedTranslation) {
                mergedTranslations.push(mergedTranslation);
            }
        });
        util.print(util.format(' [Merging %d translations]\n', mergedTranslations.length));

        done(null, destinationCol, mergedTranslations);
    },
    function(destinationCol, mergedTranslations, done) {
        var successfullyUpdatedTranslations = [];

        util.print('Merging translations...');
        async.eachSeries(mergedTranslations, function(mergedTranslation, done) {
            destinationCol.update({
                _id: mergedTranslation._id
            }, {$set: _.pick(mergedTranslation, argv.p)}, function(err, numberOfUpdatedDocuments) {
                if(numberOfUpdatedDocuments) {
                    successfullyUpdatedTranslations.push(mergedTranslation);
                }
                done(err, numberOfUpdatedDocuments);
            });
        }, function(err, result) {
            if(!err) {
                util.print(util.format(' [Merged %d translations]\n', successfullyUpdatedTranslations.length));
            }
            done(err, result);
        });
    }
], function(err) {
    if(err) {
        util.error(err);
    } else {
        util.print('Succesfully finished operation.\n');
    }
    process.exit();
});
