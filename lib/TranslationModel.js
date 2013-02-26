var mongoose = require("mongoose");
var schema = new mongoose.Schema({
    locale: String,
    path: String,
    key: String,
    value: String
});

schema.index({key: 1, path: 1, locale: 1}, {unique: true});

module.exports = mongoose.model("translation", schema);
