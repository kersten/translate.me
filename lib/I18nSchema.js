var mongoose = require("mongoose");

I18nSchema = new mongoose.Schema({
    locale:   String,
    path: String,
    root:  Boolean,
    content: {}
});

module.exports = I18nSchema;