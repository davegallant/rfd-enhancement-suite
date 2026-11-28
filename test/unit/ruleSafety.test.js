const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { readFileSync } = require('node:fs');
const { stripRedirect } = require('../../js/stripRedirect.js');

test('malformed rules cannot prevent subsequent valid rules from cleaning', () => {
  assert.equal(stripRedirect('https://shop.com/item?tag=rfd', [
    { pattern: '[' }, { pattern: 'shop' },
    { pattern: '(?<baseUrl>https://shop.com/item)\\?tag=.*' },
  ]), 'https://shop.com/item');
});

test('a no-op rule does not mask a later useful rule', () => {
  assert.equal(stripRedirect('https://shop.com/item?tag=rfd', [
    { pattern: '(?<baseUrl>.*)' },
    { pattern: '(?<baseUrl>https://shop.com/item)\\?tag=.*' },
  ]), 'https://shop.com/item');
});

test('expanding custom rules terminate within a bounded number of steps', () => {
  const context = vm.createContext({ URL, console });
  vm.runInContext(readFileSync('js/stripRedirect.js', 'utf8'), context);
  context.rules = [{ pattern: '(?=(?<baseUrl>https://shop.com/.*))https://shop.com/(?<rest>x)' }];
  assert.doesNotThrow(() => vm.runInContext(
    "stripRedirect('https://shop.com/x', rules)", context, { timeout: 200 }));
});
