const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadThemeFixture } = require('./test/helpers/themeHarness.cjs');
const scripts = ['js/theme/dom.js', 'js/theme/adapters.js', 'js/theme/thread.js'];
function fixture(name='thread') { return loadThemeFixture(name, { url: 'https://forums.redflagdeals.com/example-1/', scripts }); }
test('thread enhancer keeps post bodies, actions and anchors intact', () => {
  const h = fixture(), root = h.document.querySelector('#thread');
  const body = h.document.querySelector('#p1 .post_content');
  const reply = h.document.querySelector('.post_action_reply');
  const anchors = [...h.document.querySelectorAll('.dateline_permalink, .postlink')];
  let replies = 0; reply.addEventListener('click', () => replies++);
  const journal = h.api.dom.createJournal(); h.api.thread.enhance(root, h.api.settings.DEFAULTS, journal);
  assert.equal(h.document.querySelector('#p1 .post_content'), body);
  assert.equal(h.document.querySelector('.post_action_reply'), reply);
  assert.deepEqual([...h.document.querySelectorAll('.dateline_permalink, .postlink')], anchors);
  assert.equal(root.querySelectorAll('[data-rfdm-role="post"]').length, 2);
  assert.equal(h.document.querySelector('.profile_username').textContent, 'User');
  reply.click(); assert.equal(replies, 1);
  journal.restore(); assert.equal(root.querySelectorAll('[data-rfdm-role]').length, 0); h.dispose();
});
test('verified signature and profile statistics are marked without hiding author status', () => {
  const h = fixture('thread-rich'), journal = h.api.dom.createJournal();
  h.api.thread.enhance(h.document.querySelector('#thread'), h.api.settings.DEFAULTS, journal);
  assert.equal(h.document.querySelector('.signature').getAttribute('data-rfdm-role'), 'signature');
  assert.equal(h.document.querySelector('.profile_upvotes').getAttribute('data-rfdm-role'), 'profile-stats');
  assert.equal(h.document.querySelector('.profile_rank').getAttribute('data-rfdm-role'), null);
  assert.equal(h.document.querySelector('blockquote').textContent, 'Nested quote'); h.dispose();
});
test('editor input, labels and validation text remain native', () => {
  const h = fixture('thread-editor'), journal = h.api.dom.createJournal();
  const form = h.document.querySelector('#reply'), textarea = h.document.querySelector('#draft');
  h.api.thread.enhance(h.document.querySelector('#thread'), h.api.settings.DEFAULTS, journal);
  assert.equal(h.document.querySelector('#reply'), form);
  assert.equal(textarea.value, 'Draft text');
  assert.equal(h.document.querySelector('label[for="draft"]').textContent, 'Reply');
  assert.equal(h.document.querySelector('.error').textContent, 'Validation error'); h.dispose();
});
