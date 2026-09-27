const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadThemeFixture } = require('./test/helpers/themeHarness.cjs');
const scripts = ['js/theme/dom.js', 'js/theme/adapters.js', 'js/theme/controller.js'];
function page(name, initial = {}, options = {}) { return loadThemeFixture(name, { url: name === 'thread' ? 'https://forums.redflagdeals.com/example-1/' : 'https://forums.redflagdeals.com/hot-deals-f9/', initial, scripts, ...options }); }
test('layout improvements can be disabled while preserving native theme', async () => {
  const h = page('list-card', { 'rfdm.enabled': false });
  h.document.documentElement.setAttribute('data-theme', 'dark');
  const stop = h.api.controller.start(h.document, h.window);
  await h.flush();
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-enabled'), false);
  await h.api.settings.save({ enabled: true }); await h.flush();
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-theme'), false);
  assert.equal(h.document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(h.document.querySelectorAll('[data-rfdm-owned]').length, 0);
  await h.api.settings.save({ enabled: false }); await h.flush();
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-enabled'), false);
  assert.equal(h.document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(h.document.querySelectorAll('[data-rfdm-owned]').length, 0);
  stop(); h.dispose();
});
test('native theme changes and repeated layout toggles stay independent', async () => {
  const h = page('thread', { 'rfdm.enabled': true });
  const stop = h.api.controller.start(h.document, h.window); await h.flush();
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-theme'), false);
  h.document.documentElement.setAttribute('data-theme', 'dark'); await h.flush();
  assert.equal(h.document.documentElement.getAttribute('data-theme'), 'dark');
  for (let i = 0; i < 3; i++) { await h.api.settings.save({ enabled: false }); await h.api.settings.save({ enabled: true }); }
  await h.flush();
  assert.equal(h.document.documentElement.getAttribute('data-theme'), 'dark');
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-theme'), false);
  assert.equal(h.document.querySelectorAll('[data-rfdm-owned]').length, 0);
  stop(); h.dispose();
});
test('unsupported page and storage error retain native presentation', async () => {
  const unsupported = page('unsupported', { 'rfdm.enabled': true });
  const stop = unsupported.api.controller.start(unsupported.document, unsupported.window); await unsupported.flush();
  assert.equal(unsupported.document.documentElement.hasAttribute('data-rfdm-enabled'), false);
  assert.equal(unsupported.api.controller.getStatus().reason, 'unsupported'); stop(); unsupported.dispose();
  const failed = page('list-card', { 'rfdm.enabled': true }, { failRead: true });
  const end = failed.api.controller.start(failed.document, failed.window); await failed.flush();
  assert.equal(failed.document.documentElement.hasAttribute('data-rfdm-enabled'), false);
  assert.equal(failed.api.controller.getStatus().reason, 'settings-error'); end(); failed.dispose();
});
test('journal restores only its own attributes and nodes', () => {
  const h = page('list-card');
  const journal = h.api.dom.createJournal();
  const node = h.document.querySelector('#forum-topics');
  node.setAttribute('data-rfdm-role', 'native');
  journal.setAttribute(node, 'data-rfdm-role', 'list');
  journal.setAttribute(h.document.documentElement, 'data-rfdm-enabled', 'true');
  node.setAttribute('data-rfdm-role', 'site-update');
  journal.restore();
  assert.equal(node.getAttribute('data-rfdm-role'), 'site-update');
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-enabled'), false);
  h.dispose();
});
test('document-start startup tolerates a missing document root', async () => {
  const h = page('list-card');
  h.document.documentElement.remove();
  assert.doesNotThrow(() => h.api.controller.start(h.document, h.window));
  h.dispose();
});
