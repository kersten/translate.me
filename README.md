# translate.me

This module will help you to easily implement translations into your app. With the integrated express middleware it is
possible to translate you app with an easy to use frontend.

## Parser

The parser starts just right after the launch of your application. At this time it only parses ```.js``` and
```.mustache``` files. It searches for all occurrences of ```_.translate``` and ```{{translation key="Value"}}```.

## Setup

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

## Administration Frontend

If you have enabled the administration frontend just open the url ```/translate.me/admin``` in the browser.

## Handlebars mixin

## underscore.js mixin _.translate

## Namespaces & Keys

### handlebars

### _.translate

## License

This software is licensed under the MIT License and can be read
[here](https://raw.github.com/kersten/translate.me/master/LICENSE.md)
