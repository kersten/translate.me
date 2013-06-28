define(['underscore', 'jquery', 'purl'], function(_, $) {
    'use strict';

    /**
     * Creates a new HashParameterHandler object. Handles parameters in the hash portion of an URL.
     *
     * @param parameter {object} an set of parameters where the key specifies the parameter name and
     * the value a getter function to retrieve the param from.
     * @constructor
     */
    var HashParameterHandler = function(parameter) {
        if(parameter) {
            if(_.isObject(parameter)) {
                this.parameter = parameter;
            } else {
                throw new Error("The passed argument 'parameter' is not an object.");
            }
        } else {
            this.parameter = {};
        }
    };

    /**
     * Adds a handler for a key to a HashParameterHandler instance.
     *
     * @param {!string} key of the parameter
     * @param {!{get: function(), set: function(string)}} handler object which contains get and set function to handle
     * the parameters
     * @returns {updateHash: function(), updateParameter: function([string])} Object to update the created parameter handler
     */
    HashParameterHandler.prototype.addParameterHandler = function(key, handler) {
        var self = this;

        this.parameter[key] = handler;

        return {
            updateHash: function() {
                self.updateHash(key);
            },
            updateParameter: function(fallback) {
                self.updateParameter(key, fallback);
            }
        }
    };

    /**
     * Updates all parameters based on the parameters in the URL
     *
     * @param {?string} [key] to only update this parameter
     * @param {?string} [fallback] which will be used, if the parameter does not exist in the url
     * @returns {boolean} true if parameter(s) could be set, otherwise false
     */
    HashParameterHandler.prototype.updateParameter = function(key, fallback) {
        var result = false,
            params = $.url().fparam(key);

        if(_.isString(params)) {
            if(_.has(this.parameter, key)) {
                this._setParameter(key, params);
                result = true;
            }
        } else if(_.isObject(params)) {
            result = true;
            _.each(params, function(value, key) {
                if(_.has(this.parameter, key)) {
                    this._setParameter(key, value);
                } else {
                    result = false;
                }
            }, this);
        } else if(fallback) {
            this._setParameter(key, fallback);
        }

        return result;
    }

    /**
     * Updates the hash portion of the URL according to all passed parameters in the constructor.
     *
     * @param {string} [key] to only update a specific parameter and leave the other as they are
     */
    HashParameterHandler.prototype.updateHash = function(key) {
        var hash = "",
            params;

        if(key) {
            params = $.url().fparam();
            params[key] = this.parameter[key].get();
        } else {
            params = {};
            _.each(this.parameter, function(handler, key) {
                params[key] = handler.get();
            });
        }

        _.each(params, function(value, key) {
            if(value) {
                if(hash.length > 0) {
                    hash += '&';
                }
                hash = hash + key + "=" + encodeURIComponent(value);
            }
        });

        window.location.hash = hash;
    };

    HashParameterHandler.prototype._setParameter = function(key, value) {
        if(!_.has(this.parameter, key)) {
            throw new Error('Parameter key: "' + key + '" is unknown.');
        }
        this.parameter[key].set(decodeURIComponent(value));
    };

    return HashParameterHandler;
});
