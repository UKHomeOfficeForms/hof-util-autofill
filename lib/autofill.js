'use strict';

const Promise = require('bluebird');
const url = require('url');

const debug = require('debug')('hof:wizard:test:goto');

module.exports = (browser) => (target, input) => {
  input = input || {};
  input.default = input.default || 'abc';

  function getValue(name) {
    return input[name] || input.default;
  }

  function completeTextField(element, name) {
    const value = getValue(name);
    debug(`Filling field: ${name} with value: ${value}`);
    return browser.elementIdValue(element, value);
  }

  function completeRadio(element, type, name) {
    const value = getValue(name);
    debug(`Found ${type}`);
    return browser.elementIdAttribute(element, 'value')
      .then(val => {
        return browser.elementIdAttribute(element, 'checked')
          .then((checked) => {
            console.log(checked.value);
            if (val.value === value && !checked.value) {
              debug(`Checking ${type}: ${name} with value: ${val.value}`);
              browser.elementIdClick(element);
            } else if (val.value !== value && checked.value) {
              debug(`Unchecking ${type}: ${name} with value: ${val.value}`);
              browser.elementIdClick(element);
            } else {
              debug(`Ignoring ${type}: ${name} with value: ${val.value} - looking for ${value}`);
            }
          });
      });
  }

  function completeSelectElement(element, name) {
    const value = getValue(name);
    debug(`Selecting options: ${value} from select box: ${name}`);
    browser.selectByValue(`select[name="${name}"]`, value);
  }

  function completeStep(path) {
    return browser
      .elements('input')
      .then(fields => {
        debug(`Found ${fields.value.length} <input> elements`);
        const fillers = fields.value.map(field => {
          return browser.elementIdAttribute(field.ELEMENT, 'type')
            .then(type => {
              return browser.elementIdAttribute(field.ELEMENT, 'name')
                .then(name => {
                  if (type.value === 'radio' || type.value === 'checkbox') {
                    return completeRadio(field.ELEMENT, type.value, name.value);
                  } else if (type.value === 'text') {
                    return completeTextField(field.ELEMENT, name.value);
                  } else {
                    debug(`Ignoring field of type ${type.value}`);
                  }
                });
            });
        });
        return Promise.all(fillers);
      })
      .elements('select')
      .then(fields => {
        debug(`Found ${fields.value.length} <select> elements`);
        const fillers = fields.value.map(field => {
          return browser.elementIdAttribute(field.ELEMENT, 'name')
            .then(name => {
              return completeSelectElement(field.ELEMENT, name.value);
            });
        });
        return Promise.all(fillers);
      })
      .elements('textarea')
      .then(fields => {
        debug(`Found ${fields.value.length} <textarea> elements`);
        const fillers = fields.value.map(field => {
          return browser.elementIdAttribute(field.ELEMENT, 'name')
            .then(name => {
              return completeTextField(field.ELEMENT, name.value);
            });
        });
        return Promise.all(fillers);
      })
      .then(() => {
        debug('Submitting form');
        return browser.submitForm('form');
      })
      .then(() => {
        return browser.getUrl()
          .then(u => {
            u = url.parse(u);
            debug(`New page is: ${u.path}`);
            if (u.path !== path) {

              return completeStep(path);
            }
            debug(`Arrived at ${path}. Done.`);
          });
      });
  }

  return completeStep(target);

};
