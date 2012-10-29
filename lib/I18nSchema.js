var mongoose = require("mongoose");

var I18nString = new mongoose.Schema({
    locale: String,
    path: String,
    key: String,
    value: String
});

I18nString.index({key: 1, path: 1, locale: 1}, {unique: true});

var I18nSchema = new mongoose.Schema({
    locale: String,
    path: String,
    parentPath: mongoose.Schema.Types.ObjectId,
    root: Boolean,
    content: [{type: mongoose.Schema.Types.ObjectId, ref: "I18nString"}]
});

I18nSchema.index({locale: 1, path: 1}, {unique: true});

mongoose.model("I18nString", I18nString);
mongoose.model("I18n", I18nSchema);