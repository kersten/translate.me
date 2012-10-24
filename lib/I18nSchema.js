var mongoose = require("mongoose");

I18nSchema = new mongoose.Schema({
    locale: String,
    path: {
        type: String,
        index: { unique: true}
    },
    parentPath: mongoose.Schema.Types.ObjectId,
    root: Boolean,
    content: {}
});

module.exports = I18nSchema;