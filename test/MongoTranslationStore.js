var async = require("async"),
    _ = require("underscore")._,
    assert = require("chai").assert,
    expect = require("chai").expect,
    mongoose = require("mongoose"),
    MongoTranslationStore = require("../lib/server/MongoTranslationStore");

describe("MongoTranslationStore", function() {
    "use strict"
    var store = new MongoTranslationStore("mongodb://localhost/i18n_test"),
        testModel1, testModel1Ger, testModel2;

    before(function(done) {
        store.Model.remove({}, function() {
            async.parallel([
                function(done) {
                    testModel1 = new store.Model({
                        key: "test_key_1",
                        namespace: "test_namespace_1",
                        locale: "en"
                    });
                    testModel1.save(done);
                },
                function(done) {
                    testModel1Ger = new store.Model({
                        key: "test_key_1",
                        namespace: "test_namespace_1",
                        locale: "de",
                        value: "Ich bin Deutsch"
                    });
                    testModel1Ger.save(done);
                },
                function(done) {
                    testModel2 = new store.Model({
                        key: "test_key_2",
                        namespace: "test_namespace_2",
                        locale: "en"
                    });
                    testModel2.save(done);
                }
            ], done);
        });
    });

    after(function(done) {
        store.Model.remove({}, done);
    })

    describe("#getNamespaces", function() {
        it("should return a list of namespaces with no duplicates", function(done) {
            store.getNamespaces(function(err, namespaces) {
                assert.deepEqual(namespaces, ["test_namespace_1", "test_namespace_2"]);
                done();
            });
        });
    });

    describe("#getTranslationById", function() {
        it("should return the right translation of the passed id", function(done) {
            store.getTranslationById(testModel1.get('_id').toString(), function(err, translation) {
                assert.deepEqual(testModel1.toJSON(), translation);
                done();
            });
        });
    });

    describe("#getTranslations", function() {
        it("should return all translations, when null is passed as condition", function(done) {
            store.getTranslations(null, function(err, translations) {
                assert.deepEqual([testModel1.toJSON(), testModel1Ger.toJSON(), testModel2.toJSON()], translations);
                done();
            });
        });
        it("should return all translations, when an empty object is passed as condition", function(done) {
            store.getTranslations({}, function(err, translations) {
                assert.deepEqual([testModel1.toJSON(), testModel1Ger.toJSON(), testModel2.toJSON()], translations);
                done();
            });
        });
        it("should return test translation model 2, when namespace2 is specified as a condition", function(done) {
            store.getTranslations({
                namespaces: 'test_namespace_2'
            }, function(err, translations) {
                assert.deepEqual([testModel2.toJSON()], translations);
                done();
            });
        });
        it("should return test translation model 1 and 2, when namespace1 and 2 is specified as a condition", function(done) {
            store.getTranslations({
                namespaces: ['test_namespace_1', 'test_namespace_2']
            }, function(err, translations) {
                assert.deepEqual([testModel1.toJSON(), testModel1Ger.toJSON(), testModel2.toJSON()], translations);
                done();
            });
        });
        it("should return test translation model 1 (ger), when locale de is specified as a condition", function(done) {
            store.getTranslations({
                locales: 'de'
            }, function(err, translations) {
                assert.deepEqual([testModel1Ger.toJSON()], translations);
                done();
            });
        });
        it("should return test translation model 1, model 1 (ger) and model 2, when locale en and de is specified as a condition", function(done) {
            store.getTranslations({
                locales: ['de', 'en']
            }, function(err, translations) {
                assert.deepEqual([testModel1.toJSON(), testModel1Ger.toJSON(), testModel2.toJSON()], translations);
                done();
            });
        });
    });

});
