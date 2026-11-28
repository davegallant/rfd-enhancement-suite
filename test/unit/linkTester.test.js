const { test } = require('node:test');
const assert = require('node:assert/strict');
const cleaner = require('../../js/stripRedirect.js');

test('explains each applied rule in a nested redirect chain', () => {
  assert.equal(typeof cleaner.inspectRedirect, 'function');
  const result = cleaner.inspectRedirect('https://track.com/?url=https%3A%2F%2Fshop.com%2Fitem%3Ftag%3Drfd', [
    { name: 'Unwrap', pattern: 'track.com/\\?url=(?<baseUrl>.*)' },
    { name: 'Remove tag', pattern: '(?<baseUrl>https://shop.com/item)\\?tag=.*' },
  ]);
  assert.equal(result.url, 'https://shop.com/item');
  assert.deepEqual(result.steps.map(step => step.rule), ['Unwrap', 'Remove tag']);
  assert.equal(result.steps[0].cleaned, 'https://shop.com/item?tag=rfd');
  assert.equal(result.steps[1].original, 'https://shop.com/item?tag=rfd');
  assert.equal(result.limited, false);
});

test('reports unchanged URLs and rejects invalid or non-web input', () => {
  assert.equal(typeof cleaner.inspectRedirect, 'function');
  assert.deepEqual(cleaner.inspectRedirect('https://shop.com/item', []), {
    url: 'https://shop.com/item', steps: [], limited: false,
  });
  for (const input of ['not a URL', 'javascript:alert(1)', 'https://', 'file:///tmp/a']) {
    assert.throws(() => cleaner.inspectRedirect(input, []), /HTTP/);
  }
});
