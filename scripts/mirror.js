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
        util.print(util.format('Selecting collection: "%s"...', argv.c));
        sourceDb.collection(argv.c, function(err, translationsCol) {
            if(!err) {
                util.print(' [Selected]\n');
            }
            done(err, translationsCol);
        });
    },
    function(translationsCol, done) {
        util.print('Retrieving translations...');
        translationsCol.find().toArray(function(err, translations) {
            if(!err) {
                util.print(util.format(' [Retrieved %d translations]\n', translations.length));
            }
            done(err, translations);
        });
    },
    function(translations, done) { // Check whether has translations
        if(translations.length <= 0) {
            done("There are no translations. I'll stop now.");
        } else {
            done(null, translations);
        }
    },
    function(translations, done) { // Connect to destination db
        util.print(util.format('Connecting to destination database: "%s"...', argv.d));
        mongo.MongoClient.connect(argv.d, function(err, destinationDb) {
            if(!err) {
                util.print(' [Connected]\n');
            }
            done(err, destinationDb, translations);
        });
    },
    function(destinationDb, translations, done) {
        destinationDb.collectionNames(argv.c, function(err, names) { // Check whether translations coll exists
            if(!err) {
                if(names.length > 0) {
                    util.print(util.format('Dropping collection: "%s"...', argv.c));
                    destinationDb.dropCollection(argv.c, function(err) {
                        if(!err) {
                            util.print(' [Dropped]\n');
                        }
                        done(err, destinationDb, translations);
                    });
                } else {
                    done(null, destinationDb, translations);
                }
            } else {
                done(err);
            }
        });
    },
    function(destinationDb, translations, done) {
        util.print(util.format('Creating collection: "%s"...', argv.c));
        destinationDb.createCollection(argv.c, function(err, newCollection) {
            if(!err) {
                util.print(' [Created]\n');
            }
            done(err, newCollection, translations);
        });
    },
    function(newCollection, translations, done) {
        util.print('Copying translations...');
        newCollection.insert(translations, function(err, result) {
            if(!err) {
                util.print(util.format(' [Copied %d translations]\n', result.length));
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
