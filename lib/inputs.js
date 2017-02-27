'use strict';

const Data = require('hof-util-testdata');

module.exports = input => {
  input = input || {};
  input.default = input.default || 'abc';

  const getDefault = (name, type) => {
    type = type || 'text';
    if (name.indexOf('name') > -1) {
      if (name.indexOf('last') > -1 || name.indexOf('surname') > -1) {
        return Data.lastname;
      }
      if (name.indexOf('first') > -1) {
        return Data.firstname;
      }
      if (name.indexOf('full') > -1) {
        return Data.name;
      }
    }
    if (name.indexOf('country') > -1) {
      return Data.country;
    }
    if (name.indexOf('postcode') > -1) {
      return Data.postcode;
    }
    if (type !== 'select') {
      return input.default;
    }
  };

  return (name, type) => {
    return input[name] || getDefault(name, type);
  };
};
