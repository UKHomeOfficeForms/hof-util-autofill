# hof-util-autofill
A webdriverio plugin to automate filling a form

## Usage

First, add the command to your webdriverio client:

```js
const webdriver = require('webdriverio');
const client = webdriver.remote(options);

client.addCommand('goto', require('hof-util-autofill')(client));
```

The command can be given any name you like, here we've called it `goto`.

Then you can use the command as normal as part of your webdriver command chain.

```js
it('completes a form to a certain step automatically', () => {
  return browser.goto('/confirm')
    .getUrl()
    .then((url) => {
      assert.ok(url.indexOf('/confirm') > -1);
    });
});

it('uses any data passed as a second argument to fill out the form', () => {
  const inputs = { 'first-name': 'David', 'last-name': 'Hasselhoff' };
  return browser.goto('/confirm', inputs)
    .$('span.full-name')
    .getText()
    .then(name => {
      assert.equal(name, 'David HasselHoff');
    });
});

it('saves screenshots of errors to specified screenshot location', () => {
  const inputs = {};
  return browser.goto('/confirm', inputs, { screenshots: '/path/to/output/dir' });
});

it('tries a pre-specified number of times to get past stuck loops', () => {
  const inputs = {};
  return browser.goto('/confirm', inputs, { maxLoops: 1 });
});
```

## Options

Options are passed as a third argument to the exposed method. The following options are available:

* `maxLoops` - determines how many times a step will retry if it resolves back to itself on submission before failing. Default: `3`
* `screenshots` - specifies a location to save screenshots of the page when it gets stuck. If not specified then no screenshots are saved.
