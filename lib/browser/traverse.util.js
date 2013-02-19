(function (define) {
    "use strict";

    define([], function() {
        return {
            /**
             * Extracts a value from the passed object, based on the passed property path.
             *
             * @param {Object} object to extract a value from
             * @param {String[]} path of property names to go through to get the value from
             * @param {Number} [index] to start from in the path. Not necessary for default use.
             * @returns {Object} the value from the object, based on the passed path. Undefined, if the path does not match the object, or
             *              no value is specified
             */
            get: function(object, path, index) {
                var index = index ? index : 0,
                    propertyName = path[index];

                if(object && path && propertyName) {
                    return this.get(object[propertyName], path, ++index);
                }
                return object;
            }
        };
    });
})(typeof define=="function"?define:function(factory){module.exports=factory.apply(this, deps.map(require));});
