var mongoose = require("mongoose"),
    schema = new mongoose.Schema({
        locale: String,
        namespace: String,
        key: {
            type: String,
            required: true
        },
        value: String,
        origin: {
            type: String,
            enum: ['static', 'dynamic']
        },
        created: {
            type: Date,
            default: Date.now
        },
        changed: {
            type: Date,
            default: Date.now
        }
    });

schema.pre('save', function (next) {
    'use strict';

    this.set({changed: new Date()});
    next();
});

schema.index({key: true, namespace: true, locale: true}, {unique: true});

module.exports = schema;
