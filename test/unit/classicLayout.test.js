const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadThemeFixture } = require('../helpers/themeHarness.cjs');
const scripts = ['js/classic/classic.js'];
const REDESIGN = 'https://forums.redflagdeals.com/example-1/viewtopic_v2_replies.css?v=1';
function page(initial) { return loadThemeFixture('thread', { url: 'https://forums.redflagdeals.com/example-1/', initial, scripts }); }
test('classic layout disables the redesign stylesheet and adds the bundled one', async () => {
  const h = page({ 'rfdm.classicLayout': true, 'rfdm.enabled': false });
  const redesign = h.document.createElement('link');
  redesign.rel = 'stylesheet'; redesign.href = REDESIGN;
  h.document.head.appendChild(redesign);
  await h.flush();
  assert.equal(redesign.disabled, true);
  assert.ok(h.document.querySelector('#rfd-classic-stylesheet'));
  assert.match(h.document.querySelector('#rfd-classic-stylesheet').getAttribute('href'), /css\/classic\/viewtopic_v2\.css$/);
  h.dispose();
});
test('classic layout touches up quote and join labels', async () => {
  const h = page({ 'rfdm.classicLayout': true, 'rfdm.enabled': false });
  h.document.body.insertAdjacentHTML('beforeend', '<a id="test-quote" class="post_action_quote" title="Quote Reply"><span class="post_action_text">Quote Reply</span></a>');
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.equal(h.document.querySelector("#test-quote").title, 'Reply with quote');
  assert.equal(h.document.querySelector("#test-quote .post_action_text").textContent, 'Reply with quote');
  h.dispose();
});
test('compact layout leaves the redesign stylesheet alone', async () => {
  const h = page({ 'rfdm.classicLayout': false, 'rfdm.enabled': true });
  const redesign = h.document.createElement('link');
  redesign.rel = 'stylesheet'; redesign.href = REDESIGN;
  h.document.head.appendChild(redesign);
  await h.flush();
  assert.ok(!redesign.disabled);
  assert.equal(h.document.querySelector('#rfd-classic-stylesheet'), null);
  h.dispose();
});
