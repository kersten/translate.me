var assert = require("chai").assert,
    expect = require("chai").expect,
    parseHandlebars = require("../lib/server/parser/HandlebarsParser");

describe("JavascriptParser", function() {
    it("should return an array of translations, when translation statements are nested in an if else statement", function() {
        assert.deepEqual(parseHandlebars('{{#namespace name="Shipments"}}<div class="state"><p class="address-label">{{translation key="Status:"}}</p>'
         + '{{#if delivered}}<i class="icon-check"></i> <span>{{translation key="Delivered" namespace="Track&Trace/ShipmentStatus"}}</span>'
         + '{{else}}{{#if processed}}<i class="icon-truck flip-vertical"></i> <span>{{translation key="In Transit" '
         + 'namespace="Track&Trace/ShipmentStatus"}}</span>{{else}}<span class="iconic iconic-box"></span> <span>'
         + '{{translation key="Ready for pickup" namespace="Track&Trace/ShipmentStatus"}}</span>{{/if}}{{/if}}</div>{{/namespace}}'),
            [{
                key: 'Status:',
                namespace: 'Shipments'
            },{
                key: 'Delivered',
                namespace: 'Track&Trace/ShipmentStatus'
            },{
                key: 'In Transit',
                namespace: 'Track&Trace/ShipmentStatus'
            },{
                key: 'Ready for pickup',
                namespace: 'Track&Trace/ShipmentStatus'
            }]);
    });
});
