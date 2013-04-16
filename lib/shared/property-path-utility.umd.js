(function (root, factory) {
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.propertiesPathUtility = factory();
    }
}(this, function () {
    /**
     * Extracts a value from the passed object, based on the passed property path.
     *
     * @param {Object} object to extract a value from
     * @param {String[]} path of property names to go through to get the value from
     * @param {Number} [index] to start from in the path. Not necessary for default use.
     * @returns {Object} the value from the object, based on the passed path. Undefined, if the path does not match the object, or
     *              no value is specified
     */
    function get(object, path, index) {
        var index = index ? index : 0,
            propertyName = path[index];

        if(object && path && propertyName) {
            return get(object[propertyName], path, ++index);
        }
        return object;
    }

    /**
     * Replaces placeholder, containing property paths, in a string with values of an object.
     *
     * The placeholder is delimited by two opening braces and two closing braces. {{...}}. In
     * between the braces, a property path is specified. A property path navigates down to a value
     * based on field names.
     *
     * E.g. the placeholder: {{person.name}} with with an object: { person: { name: 'John' } } would
     * direct to the value 'John'.
     *
     * A placeholder will not be removed, if no property path matches in the passed object.
     *
     * @param {string} str containing placeholder which shall be replaced by the values of the passed object
     * @param {object} object holding the values which shall be replaced in the passed str
     * @returns {string} where all placeholder have been replaced with values from the object
     */
    function replace(str, object) {
        var placeholderRegex = /\{\{(.+?)\}\}/g,
            result = str,
            replacementCorrection = 0,
            match, value;

        if(typeof str !== 'string') {
            throw new TypeError("The argument str is not a string.");
        }
        if(typeof object !== 'object') {
            throw new TypeError("Could not replace properties in: \"" + str + "\". The passed object is not of type object.");
        }

        if(str.length > 1) {
            while((match = placeholderRegex.exec(str))) {
                if((value = get(object, match[1].split(".")))) {
                    result = result.substring(0, placeholderRegex.lastIndex - match[0].length + replacementCorrection) + value
                        + result.substring(placeholderRegex.lastIndex + replacementCorrection);
                    replacementCorrection = (match[0].length - value.length) * -1;
                }
            }
        }

        return result;
    }

    return {
        replace: replace
    }
}));
