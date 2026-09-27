const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { readFileSync } = require('node:fs');
function detect(file, path = '/hot-deals-f9/', host = 'forums.redflagdeals.com') {
  const dom = new JSDOM(readFileSync(`test/fixtures/rfd/${file}.html`, 'utf8'), { url: `https://${host}${path}`, runScripts: 'outside-only' });
  dom.window.eval(readFileSync('js/theme/adapters.js', 'utf8'));
  return dom.window.RFDModern.adapters.detect(dom.window.document, new URL(dom.window.location));
}
test('recognizes verified card list and native empty list shell', () => {
  assert.equal(detect('list-card')?.kind, 'list');
  assert.equal(detect('list-card')?.root.id, 'forum-topics');
  assert.equal(detect('list-empty'), null); // Synthetic empty state is not verified against live RFD.
});
test('recognizes thread root, not a sidebar title', () => {
  assert.equal(detect('thread', '/example-1/')?.root.id, 'thread');
  assert.equal(detect('unsupported', '/login/') , null);
});
test('rejects unsupported host and routes', () => {
  assert.equal(detect('list-card', '/hot-deals-f9/', 'example.com'), null);
  assert.equal(detect('list-card', '/search.php'), null);
  assert.equal(detect('thread', '/posting.php'), null);
  assert.equal(detect('thread', '/example-1/?view=print'), null);
});
