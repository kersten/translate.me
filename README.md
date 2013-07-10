# translate.me

This module will help you to easily implement translations into your app. With the integrated express middleware it is
possible to translate you app with an easy to use frontend.

## Build Status

[![Build Status](https://travis-ci.org/kersten/translate.me.png?branch=master)](https://travis-ci.org/kersten/translate.me)

## Installation

### translate.Me module

Just hit ```npm install translate.me``` in your application directory.

At this time it only parses ```.js``` and ```.mustache``` files. This limitations will be fixed in one of the next
versions.

### Setup

    var TranslateMe = require('translate.me'),
        translateMe = new TranslateMe('mongodb://localhost/i18n', 'en', ['de', 'fr', 'fi', 'cz']),
        express = require('express'),
        app = express();

    app.use(express.bodyParser());
    app.use(express.methodOverride());

    /*
     * It is imported to place the 'reqister routers' after
     * all use-statements, to prevent any blockage of other middlewares.
     */
    translationModule.registerRoutes(app, true);

    app.get('/', function (req, res) {
        res.sendfile('./example/views/index.html');
    });

### Administration Frontend

If you have enabled the administration frontend just open the url ```/translate.me/admin``` in the browser. Translating
in the UI is very easy. You can select your namespaces if you use them, or just the global namespace where all keys
without a namespace are saved. Initially the global namespace and one language of your available translations is
displayed. You get a list of all keys, just translate them. They will be saved after loosing focus of the current input
element.

## The Parser

The parser starts just right after the launch of your application. It searches for all occurrences of ```_.translate```
and ```{{translation key="Value"}}```. The keys will be saved into the given mongo database.

## Dynamic translations

If you have dynamic content to translate that is not yet known to the system it will save it and then you are able to
translate it. Before production launch you should inspect your application and trigger all dynamic string, so your
translators are able to translate these strings. Otherwise the default dynamic strings will be displayed.

## Usage

### RequireJS

If your application uses requirejs module loading you just need to include one file.

    define(['underscore', '/translate.me/translate.amd.js'], function (_) {
        console.log(_.translate("Hello World", "MyCustomNamespace"));
    });

### Non amd

You may use this module without amd loading, to do that you have to load jquery and underscore. Before translating works
you have to implement the following scripts:

    <script type="text/javascript" src="/translate.me/api/script/translations"></script>
    <script type="text/javascript" src="/translate.me/api/script/stats"></script>
    <script type="text/javascript" src="/translate.me/translate.js"></script>

Then you can start using ```_.translate``` in your JS code.

     $(function () {
        _.setPreferredLocale('en');
        $('#helloworld').text(_.translate("Hello World", "MyCustomNamespace"));
    });

### Handlebars helper

If you are using handlebars you can use our helper to translate strings directly in the template.

    {{#namespace name="MyCustomNamespace"}}
        <h1>{{translation key="Hello World"}}</h1>
    {{/namespace}}

## Namespaces & Keys

You may namespace your translations to differ between views or something else. Namespaces can be used in handlebars and
underscore.

### handlebars

Like in the example above you just need to add the namespace helper. ```{{#namespace name="MyCustomNamespace"}}``` will
use translations of the ```MyCustomNamespace``` namespace. If you cannot nest namespaces, but you are able to get
translations inside a namespace out of another namespace.

    {{#namespace name="MyCustomNamespace"}}
        {{translation key="Hello World"}}
        {{#namespace name="Global"}}
            {{translation key="Hello World from 'Global' namespace"}}
        {{/namespace}}
    {{/namespace}}

### _.translate

With underscore namespaces are as simple as pie. Just pass a second parameter to the ```translate``` function and it is
used as the namespace.

    _.translate("Hello World", "MyCustomNamespace");
    _.translate("Hello World from 'Global' namespace");

## License

This software is licensed under the MIT License and can be read
[here](https://raw.github.com/kersten/translate.me/master/LICENSE.md)
