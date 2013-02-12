var mongoose = require("mongoose");

var I18nString = new mongoose.Schema({
    locale: String,
    path: String,
    key: String,
    value: String
});

I18nString.index({key: 1, path: 1, locale: 1}, {unique: true});

mongoose.model("I18nString", I18nString);
