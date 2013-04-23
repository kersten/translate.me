var util = require('util'),
    _ = require('underscore')._,
    async = require('async'),
    mongoose = require('mongoose'),
    optimist = require('optimist'),
    translationSchema = require('../lib/server/TranslationSchema');

var argv = optimist.usage('Maps translation from a Mongo instance with translation in an ' +
        'old format to another Mongo instance which has an index in the new format.\n' +
        'Note, that it is important, that the destination instance has a ' +
        'translation index in the new format!.\n' +
        'Usage: $0')
        .demand('source').string('source').describe('source', "Mongo URL to the source instance.")
        .demand('sourceMasterLocale').string('sourceMasterLocale').describe('sourceMasterLocale', "The master locale of the source translations.")
        .demand('destination').string('destination').describe('destination', "Mongo URL to the destination instance.")
        .boolean('printReport').default('printReport', false).describe('printReport', "Prints a report of all the mappings.")
        .boolean('dryRun').default('dryRun', false).describe('dryRun', 'Maps translations, but does not save them to the destination instance.')
        .argv;

console.log("Connecting to databases...");
async.parallel({
    LegacyTranslationModel: function(done) {
        var sourceDb = mongoose.createConnection(argv.source);
        sourceDb.on('connected', function() {
            done(null, sourceDb.model('translation', new mongoose.Schema({
                key: String,
                namespace: String,
                locale: String,
                value: String
            })));
        });
        sourceDb.on('error', function(err) {
            done(err);
        });
    },
    CurrentTranslationModel: function(done) {
        var destinationDb = mongoose.createConnection(argv.destination);
        destinationDb.on('connected', function() {
            done(null, destinationDb.model('translation', translationSchema));
        });
        destinationDb.on('error', function(err) {
            done(err);
        });
    }
}, function(err, results) {
    if(!err) {
        console.log("Connected to databases.");
        if(results && results.LegacyTranslationModel && results.CurrentTranslationModel) {
            console.log("Mapping translations...");
            mapTranslations(results.LegacyTranslationModel, results.CurrentTranslationModel, function(err, mappedIndices) {
                if(!err && mappedIndices) {
                    console.log("Mapped " + mappedIndices.length + " translations.");
                    if(argv.printReport) {
                        _.each(mappedIndices, function(index) {
                            var translationText = "";
                            _.each(index.translations, function(translation) {
                                 translationText += util.format('%s:"%s", ', translation.locale, translation.value);
                            });
                            console.log(util.format('"%s/%s": %s', index.namespace, index.key, translationText));
                        });
                    }
                    if(!argv.dryRun) {
                        console.log("Updating " + mappedIndices.length + " translations...");
                        async.map(mappedIndices, function(model, done) {
                            model.save(done);
                        }, function(err, results) {
                            if(!err && results) {
                                if(results.length === mappedIndices.length) {
                                    console.log("Successfully updated " + results.length + " translations.");
                                }
                            } else {
                                console.log("Error while saving the updated translations.");
                            }
                            process.exit();
                        });
                    } else {
                        process.exit();
                    }
                } else {
                    console.log("Error. Something went wrong mapping translations.");
                    process.exit();
                }
            });
        } else {
            console.log("Error. Database models not properly initialized.");
        }
    } else {
        console.log(err);
    }
});

function mapTranslations(LegacyTranslationModel, CurrentTranslationModel, done) {
    async.parallel({
        retrieveSourceTranslations: function(done) {
            LegacyTranslationModel.find(done);
        },
        retrieveDestinationIndex: function(done) {
            CurrentTranslationModel.find(done);
        }
    }, function(err, results) {
        var mappedIndices;
        if(!err) {
            if(results && results.retrieveSourceTranslations && results.retrieveDestinationIndex) {
                _.each(results.retrieveDestinationIndex, function(indexTranslation) {
                    var matchingTranslations = _.where(results.retrieveSourceTranslations, {
                        key: indexTranslation.key,
                        namespace: indexTranslation.namespace
                    });
                    _.each(matchingTranslations, function(translation) {
                        if(translation.locale != argv.sourceMasterLocale && translation.value) {
                            indexTranslation.translate(translation.locale, translation.value);
                        }
                    });
                    if(indexTranslation.isModified('translations')) {
                        if(!mappedIndices) {
                            mappedIndices = [];
                        }
                        mappedIndices.push(indexTranslation);
                    }
                });
                done(null, mappedIndices);
            } else {
                done("Could not retrieve source translations or destination index.");
            }
        } else {
            done(err);
        }
    });
}
