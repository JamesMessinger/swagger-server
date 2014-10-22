(function() {
  'use strict';

  var tv4 = require('tv4');
  var _ = require('lodash');
  var syntaxError = require('../errors').createSyntaxError;


  // Valid patterns for each data type
  var dataTypePatterns = {
    integer: /^[+-]?(\d+|0x[\dA-F]+)$/i,

    number: /^[+-]?(\d*[\.,])?\d+(e[+-]?\d+)?$/,

    date: /^\d{4}-\d{2}-\d{2}$/,

    'date-time': /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}\:\d{2})$/i
  };


  // Numeric type ranges
  var ranges = {
    int32: {
      min: -2147483648,
      max: 2147483647
    },

    int64: {
      min: -9223372036854775808,
      max: 9223372036854775807
    },

    byte: {
      min: 0,
      max: 255
    },

    float: {
      min: -3.402823e38,
      max: 3.402823e38
    },

    double: {
      min: -1.7976931348623157E+308,
      max: 1.7976931348623157E+308
    }
  };


  var validateSchema = module.exports = {
    /**
     * Parses the given value according to the given schema and
     * returns the parsed value.  If parsing or schema validation
     * fails, an error is thrown.
     *
     * @param {*} value
     * @param {object} schema
     * @returns {*}
     */
    parse: function parse(value, schema) {
      switch (schema.type) {
        case 'string':
          switch(schema.format) {
            case 'byte':
              return parseInteger(value, schema);
            case 'date':
            case 'date-time':
              return parseDate(value, schema);
            default:
              return parseString(value, schema);
          }
          break;
        case 'number':
          return parseNumber(value, schema);
        case 'integer':
          return parseInteger(value, schema);
        case 'boolean':
          return parseBoolean(value, schema);
        case 'array':
          return parseArray(value, schema);
        case 'object':
          return parseObject(value, schema);
        default:
          if (_.isEmpty(schema.type)) {
            return parseObject(value, schema);
          }
          throw syntaxError('Invalid JSON schema type: %s', schema.type);
      }
    },


    /**
     * Validates the given value against the given schema.
     *
     * @param {*} value
     * @param {object} schema
     * @returns {boolean} true if valid; otherwise, an error is thrown
     */
    validate: function validate(value, schema) {
      return !!validateSchema.parse(value, schema);
    },


    /**
     * Validates the given value against the given schema.
     * If validation fails, an Error is returned.
     *
     * @param {*} value
     * @param {object} schema
     * @returns {Error|undefined}  Returns an Error if validation failed; otherwise, returns undefined.
     */
    safeValidate: function safeValidate(value, schema) {
      try {
        if (validateSchema.validate(value, schema)) {
          return undefined;
        }
      }
      catch (e) {
        return e;
      }
    },


    /**
     * Determines whether the given value is valid for the given schema.
     *
     * @param {*} value
     * @param {object} schema
     * @returns {boolean} true if valid; otherwise, false
     */
    isValid: function validate(value, schema) {
      try {
        return validateSchema.validate(value, schema);
      }
      catch (e) {
        return false;
      }
    }
  };


  /**
   * Returns the given value, or the default value if the given value is undefined.
   * If the returned value is `undefined`, then the value is missing and optional,
   * so no further validation is needed.
   * Throws an error if the value is missing and required
   */
  function getValueToValidate(value, schema) {
    if (value === undefined) {
      if (schema.required) {
        throw syntaxError('Required value is missing');
      }

      // The value is empty and not required, so return the default value.
      // If there's no default, then the returned value is `undefined`,
      // which indicates that no further validation is needed.
      return schema.default;
    }

    // The value is present, but is it blank?
    if (value === null || value === '') {
      // It's blank, so return the default value
      if (schema.default !== undefined) {
        return schema.default;
      }
      else {
        // There's no default, so return the blank value
        return value;
      }
    }

    // It's not blank, so return the existing value
    return value;
  }


  function jsonValidate(value, schema, detailedErrorMessage) {
    if (tv4.validate(value, schema)) {
      return true;
    }
    else if (detailedErrorMessage) {
      throw syntaxError('%s \nData path: "%s" \nSchema path: "%s"\n',
        tv4.error.message, tv4.error.dataPath, tv4.error.schemaPath);
    }
    else {
      throw syntaxError(tv4.error.message);
    }
  }


  function parseInteger(value, schema) {
    // Handle missing, required, and default
    value = getValueToValidate(value, schema);

    // If undefined, then the value is optional
    if (value === undefined) return;

    // Make sure it's a properly-formatted integer
    var parsedValue = parseInt(value);
    if (_.isNaN(parsedValue) || !_.isFinite(parsedValue) || !dataTypePatterns.integer.test(value)) {
      throw syntaxError('Not a properly-formatted whole number');
    }

    // Force the schema to be validated as an integer
    var originalType = schema.type;
    schema.type = 'integer';

    // Validate against the schema
    try {
      jsonValidate(parsedValue, schema);
    }
    finally {
      // Restore the original schema type
      schema.type = originalType;
    }

    // Validate the format
    var range = ranges[schema.format];
    if (range) {
      if (parsedValue < range.min || parsedValue > range.max) {
        throw syntaxError('%s values must be between %d and %d', schema.format, range.min, range.max);
      }
    }

    return parsedValue;
  }


  function parseNumber(value, schema) {
    // Handle missing, required, and default
    value = getValueToValidate(value, schema);

    // If undefined, then the value is optional
    if (value === undefined) return;

    // Make sure it's a properly-formatted number
    var parsedValue = parseFloat(value);
    if (_.isNaN(parsedValue) || !_.isFinite(parsedValue) || !dataTypePatterns.number.test(value)) {
      throw syntaxError('Not a valid numeric value');
    }

    // Validate against the schema
    jsonValidate(parsedValue, schema);

    // Validate the format
    var range = ranges[schema.format];
    if (range) {
      if (parsedValue < range.min || parsedValue > range.max) {
        throw syntaxError('%s values must be between %d and %d', schema.format, range.min, range.max);
      }
    }

    return parsedValue;
  }


  function parseBoolean(value, schema) {
    // Handle missing, required, and default
    value = getValueToValidate(value, schema);

    // If undefined, then the value is optional
    if (value === undefined) return;

    // "Parse" the value
    var parsedValue = value;
    var stringValue = _(value).toString().toLowerCase();
    if (stringValue === 'true') {
      parsedValue = true;
    }
    else if (stringValue === 'false') {
      parsedValue = false;
    }

    // Validate against the schema
    jsonValidate(parsedValue, schema);

    return parsedValue;
  }


  function parseString(value, schema) {
    // Handle missing, required, and default
    value = getValueToValidate(value, schema);

    // If undefined, then the value is optional
    if (value === undefined) return;

    // Validate against the schema
    jsonValidate(value, schema);

    return value;
  }


  function parseArray(value, schema) {
    // Handle missing, required, and default
    value = getValueToValidate(value, schema);

    // If undefined, then the value is optional
    if (value === undefined) return;

    var parsedValue = value;

    if (_.isString(value) && value.length) {
      // Parse the string to an array
      switch (schema.collectionFormat) {
        case 'ssv':
          parsedValue = value.split(' ');
          break;
        case 'tsv':
          parsedValue = value.split('\t');
          break;
        case 'pipes':
          parsedValue = value.split('|');
          break;
        default: // csv
          parsedValue = value.split(',');
      }
    }

    // First, parse the items in the array
    if (_.isPlainObject(schema.items) && _.isArray(parsedValue)) {
      for (var i = 0; i < parsedValue.length; i++) {
        var item = parsedValue[i];
        try {
          parsedValue[i] = validateSchema.parse(item, schema.items);
        }
        catch (e) {
          throw syntaxError('Unable to parse item %d (%j). %s', i, item, e.message);
        }
      }
    }

    // Validate against the schema
    jsonValidate(parsedValue, schema);

    return parsedValue;
  }


  function parseObject(value, schema) {
    // Handle missing, required, and default
    value = getValueToValidate(value, schema);

    // If undefined, then the value is optional
    if (value === undefined) return;

    // Parse the value
    var parsedValue = value;
    if (_.isString(value) && value.length) {
      parsedValue = JSON.parse(value);
    }

    // Validate against the schema
    jsonValidate(parsedValue, schema, true);

    return parsedValue;
  }


  function parseDate(value, schema) {
    var parsedValue;

    // Handle missing, required, and default
    value = getValueToValidate(value, schema);

    // If undefined, then the value is optional
    if (value === undefined) return;

    // If the value is already a Date, then we can skip some validation
    if (_.isDate(value)) {
      parsedValue = value;
    }
    else {
      // Validate against the schema
      jsonValidate(value, schema);

      // Validate the format
      var formatPattern = dataTypePatterns[schema.format];
      if (!formatPattern.test(value)) {
        throw syntaxError('Not a properly formatted %s', schema.format);
      }

      // Parse the date
      parsedValue = new Date(value);
      if (!parsedValue || isNaN(parsedValue.getTime())) {
        throw syntaxError('Invalid %s', schema.format);
      }
    }

    if (schema.minimum) {
      var minDate = new Date(schema.minimum);
      if (isNaN(minDate.getTime())) {
        throw syntaxError('The "minimum" value specified in the Swagger spec is invalid (%s)', schema.minimum);
      }

      if (parsedValue < minDate) {
        throw syntaxError('Value %j is less than minimum %j', parsedValue, minDate);
      }

      if (schema.exclusiveMinimum === true) {
        if (parsedValue.getTime() === minDate.getTime()) {
          throw syntaxError('Value %j is equal to exclusive minimum %j', parsedValue, minDate);
        }
      }
    }

    if (schema.maximum) {
      var maxDate = new Date(schema.maximum);
      if (isNaN(maxDate.getTime())) {
        throw syntaxError('The "maximum" value specified in the Swagger spec is invalid (%s)', schema.maximum);
      }

      if (parsedValue > maxDate) {
        throw syntaxError('Value %j is greater than maximum %j', parsedValue, maxDate);
      }

      if (schema.exclusiveMaximum === true) {
        if (parsedValue.getTime() === maxDate.getTime()) {
          throw syntaxError('Value %j is equal to exclusive maximum %j', parsedValue, maxDate);
        }
      }
    }

    return parsedValue;
  }

})();
