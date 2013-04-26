var assert = require("chai").assert,
    expect = require("chai").expect,
    propertyPathUtility = require("../lib/shared/property-path-utility.umd.js");


describe("PropertyPathUtility", function() {
    it("should return the correct text.", function() {
        var result = propertyPathUtility.replace("We're sorry, but we don't support version {{version}} of {{name}}. Please update your browser, by following this link:", {
            name: "Chrome",
            version: 5
        });
        assert.equal("We're sorry, but we don't support version 5 of Chrome. Please update your browser, by following this link:", result);
    });
});
