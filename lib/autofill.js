'use strict';

const Promise = require('bluebird');
const url = require('url');
const Inputs = require('./inputs');

const debug = require('debug')('hof:util:autofill');

module.exports = (browser) => (target, input) => {

  const getValue = Inputs(input);

  function completeTextField(element, name) {
    const value = getValue(name, 'text');
    debug(`Filling field: ${name} with value: ${value}`);
    return browser
      .elementIdClear(element)
      .elementIdValue(element, value)
      .catch((e) => {
        // any error here is *probably* because the field is hidden
        // ignore and hope for the best
      });
  }

  function completeFileField(element, name) {
    const value = getValue(name, 'file');
    if (value) {
      debug(`Uploading file: ${value} into field: ${name}`);
      return browser
        .addValue(`input[name="${name}"]`, value);
    } else {
      debug(`No file specified for input ${name} - ignoring`);
    }
  }

  function completeRadio(element, name) {
    const value = getValue(name, 'radio');
    if (!value) {
      return browser.elements(`input[type="radio"][name="${name}"]`)
        .then(radios => {
          debug(`Checking random radio: ${name}`);
          const index = 1 + Math.floor(Math.random() * (radios.value.length - 1));
          return browser.elementIdClick(radios.value[index].ELEMENT);
        });
    }
    return browser.elementIdAttribute(element, 'value')
      .then(val => {
        if (val.value === value) {
          debug(`Checking radio: ${name} with value: ${val.value}`);
          browser.elementIdClick(element);
        }
      });
  }

  function completeCheckbox(element, name) {
    const value = getValue(name, 'checkbox');
    return browser.elementIdAttribute(element, 'value')
      .then(val => {
        return browser.elementIdAttribute(element, 'checked')
          .then((checked) => {
            if (!value && !checked.value) {
              debug(`Checking checkbox: ${name} with value: ${val.value}`);
              browser.elementIdClick(element);
            } else if (value.indexOf(val.value) > -1 && !checked.value) {
              debug(`Checking checkbox: ${name} with value: ${val.value}`);
              browser.elementIdClick(element);
            } else if (value.indexOf(val.value) === -1 && checked.value) {
              debug(`Unchecking checkbox: ${name} with value: ${val.value}`);
              browser.elementIdClick(element);
            } else {
              debug(`Ignoring checkbox: ${name} with value: ${val.value} - looking for ${value}`);
            }
          });
      });
  }

  function completeSelectElement(element, name) {
    const value = getValue(name, 'select');
    if (!value) {
      return browser.elementIdElements(element, 'option')
        .then((options) => {
          const index = 1 + Math.floor(Math.random() * (options.value.length - 1));
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
                  if (type.value === 'radio') {
                    return completeRadio(field.ELEMENT, name.value);
                  } else if (type.value === 'checkbox') {
                    return completeCheckbox(field.ELEMENT, name.value);
                  } else if (type.value === 'file') {
                    return completeFileField(field.ELEMENT, name.value);
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
