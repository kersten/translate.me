var assert = require("chai").assert,
    expect = require("chai").expect,
    parseJavascript = require("../lib/server/parser/JavascriptParser");

describe("JavascriptParser", function() {
    it("should return an empty array, when no translate statement is found", function() {
        assert.deepEqual(parseJavascript(""), []);
    });
    it("should return an empty array, when translate statement has been found, but the key is empty", function() {
        assert.deepEqual(parseJavascript('Translator.translate("")'), []);
    });
    it("should return a translation, when the first argument is a key", function() {
        assert.deepEqual(parseJavascript('Translator.translate("test")'), [{key: "test", namespace: ""}]);
    });
    it("should return a translation, when the first argument is the key and the second a namespace", function() {
        assert.deepEqual(parseJavascript('Translator.translate("test-key", "test-namespace")'),
            [{key: "test-key", namespace: "test-namespace"}]);
    });
    it("should return a translation and use the default namespace, when the second argument is a context", function() {
        assert.deepEqual(parseJavascript('Translator.translate("{{that}} should be replaced", {that: "this"})'),
            [{key: "{{that}} should be replaced", namespace: ""}]);
    });
    it("should return an empty array, when the first argument is an empty options object", function() {
        assert.deepEqual(parseJavascript('Translator.translate({})'), []);
    });
    it("should return an empty array, when the first argument is an options object with an empty key string", function() {
        assert.deepEqual(parseJavascript('Translator.translate({key: ""})'), []);
    });
    it("should return an empty array, when the first argument is an options object with a key property which is not a literal", function() {
        assert.deepEqual(parseJavascript('Translator.translate({key: function() {return "key"}})'), []);
    });
    it("should return a translation with the default namespace, when the first argument is an options object with a key string", function() {
        assert.deepEqual(parseJavascript('Translator.translate({key: "options-key"})'), [{
            key: "options-key",
            namespace: ""
        }]);
    });
    it("should return a translation, when the first argument is an options object with a key and a namespace string", function() {
        assert.deepEqual(parseJavascript('Translator.translate({key: "options-key", namespace: "options-namespace"})'), [{
            key: "options-key",
            namespace: "options-namespace"
        }]);
    });
    it("should return a translation, when the first argument is an options object with a namespace and a key string", function() {
        assert.deepEqual(parseJavascript('Translator.translate({namespace: "options-namespace", key: "options-key"})'), [{
            key: "options-key",
            namespace: "options-namespace"
        }]);
    });
    it("should return a translation, when the translate statement is used in a key reference of an object", function() {
        assert.deepEqual(parseJavascript('object[Translator.translate("key", "namespace")] = "hans";'), [{
            key: "key",
            namespace: "namespace"
        }]);
    });
});
