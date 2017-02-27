'use strict';

const Promise = require('bluebird');
const url = require('url');
const Inputs = require('./inputs');

const debug = require('debug')('hof:wizard:test:goto');

module.exports = (browser) => (target, input) => {

  const getValue = Inputs(input);

  function completeTextField(element, name) {
    const value = getValue(name, 'text');
    debug(`Filling field: ${element} with value: ${value}`);
    return browser.elementIdValue(element, value);
  }

  function completeRadio(element, type, name) {
    const value = getValue(name, type);
    debug(`Found ${type}`);
    return browser.elementIdAttribute(element, 'value')
      .then(val => {
        return browser.elementIdAttribute(element, 'checked')
          .then((checked) => {
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
    const value = getValue(name, 'select');
    if (!value) {
      return browser.elementIdElements(element, 'option')
        .then((options) => {
          const index = options.value.length - 1;
          debug(`Selecting option: ${index} from select box: ${name}`);
          return browser.selectByIndex(`select[name="${name}"]`, index);
        });
    } else {
      debug(`Selecting options: ${value} from select box: ${name}`);
      return browser.selectByValue(`select[name="${name}"]`, value);
    }
  }

  function completeStep(path) {
    return browser
      .elements('input')
      .then(fields => {
        debug(`Found ${fields.value.length} <input> elements`);
        return Promise.map(fields.value, field => {
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
        }, {concurrency: 1});
      })
      .elements('select')
      .then(fields => {
        debug(`Found ${fields.value.length} <select> elements`);
        return Promise.map(fields.value, field => {
          return browser.elementIdAttribute(field.ELEMENT, 'name')
            .then(name => {
              return completeSelectElement(field.ELEMENT, name.value);
            });
        });
      })
      .elements('textarea')
      .then(fields => {
        debug(`Found ${fields.value.length} <textarea> elements`);
        return Promise.map(fields.value, field => {
          return browser.elementIdAttribute(field.ELEMENT, 'name')
            .then(name => {
              return completeTextField(field.ELEMENT, name.value);
            });
        });
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
