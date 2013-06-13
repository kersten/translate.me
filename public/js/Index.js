require.config({
    paths: {
        "underscore": "../components/underscore/underscore-min",
        "jquery": "../components/jquery/jquery.min",
        "jquery.color": "../components/jquery-color/jquery.color",
        "purl": "../components/purl/purl",
        "backbone": "../components/backbone/backbone-min",
        "bootstrap": "../components/bootstrap/docs/assets/js/bootstrap.min",
        "bootstrap-combobox": "../components/bootstrap-combobox/js/bootstrap-combobox"
    },

    shim: {
        "underscore": {
            exports: "_"
        },
        "jquery": {
            exports: "jQuery"
        },
        "jquery.color": {
            deps: ["jquery"]
        },
        "purl": {
            deps: ["jquery"]
        },
        "backbone": {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        "bootstrap": {
            deps: ["jquery"]
        },
        "bootstrap-combobox": {
            deps: ["bootstrap"]
        }
    }
});

require(['jquery', './AdminUIView'], function($, AdminUIView) {
    'use strict';

    new AdminUIView({
        el: $('body')
    }).render();
});
