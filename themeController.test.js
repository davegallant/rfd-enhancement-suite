const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadThemeFixture } = require('./test/helpers/themeHarness.cjs');
const scripts = ['js/theme/dom.js', 'js/theme/adapters.js', 'js/theme/thread.js', 'js/theme/controller.js'];
test('search cleanup persists footer choices and restores both controls with clutter off', async () => {
  const h = loadThemeFixture('search', { url: 'https://forums.redflagdeals.com/search.php?keywords=anker', initial: { 'rfdm.enabled': false }, scripts });
  const stop = h.api.controller.start(h.document, h.window); await h.flush();
  const html = h.document.documentElement;
  assert.equal(html.getAttribute('data-rfdm-page'), 'search');
  assert.equal(html.getAttribute('data-rfdm-hide-sidebar'), 'true');
  assert.equal(html.getAttribute('data-rfdm-hide-footer'), 'true');
  await h.api.settings.save({ hideFooter: false }); await h.flush();
  assert.equal(html.getAttribute('data-rfdm-hide-footer'), 'false');
  assert.equal((await h.api.settings.load()).hideFooter, false);
  await h.api.settings.save({ hideFooter: true, clutterEnabled: false }); await h.flush();
  assert.notEqual(html.getAttribute('data-rfdm-hide-footer'), 'true');
  assert.notEqual(html.getAttribute('data-rfdm-hide-sidebar'), 'true');
  await h.api.settings.save({ clutterEnabled: true }); await h.flush();
  assert.equal(html.getAttribute('data-rfdm-hide-footer'), 'true');
  stop();
  assert.equal(html.hasAttribute('data-rfdm-hide-footer'), false);
  h.dispose();
});
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
test('clutter cleanup stays active when modern layout is off', async () => {
  const h = page('thread', { 'rfdm.enabled': false, 'rfdm.hidePromotions': true, 'rfdm.compactProfiles': true });
  const stop = h.api.controller.start(h.document, h.window); await h.flush();
  const html = h.document.documentElement;
  assert.equal(html.hasAttribute('data-rfdm-enabled'), false);
  assert.equal(html.getAttribute('data-rfdm-hide-promotions'), 'true');
  assert.equal(html.getAttribute('data-rfdm-compact-profiles'), 'true');
  assert.equal(h.document.querySelector('.profile_numposts').getAttribute('data-rfdm-role'), 'profile-stats');
  stop(); h.dispose();
});
test('clutter master restores promotions and profile details independently of layout', async () => {
  const h = page('thread', { 'rfdm.enabled': true, 'rfdm.clutterEnabled': false });
  const stop = h.api.controller.start(h.document, h.window); await h.flush();
  const html = h.document.documentElement;
  assert.equal(html.getAttribute('data-rfdm-enabled'), 'true');
  assert.equal(html.getAttribute('data-rfdm-hide-promotions'), 'false');
  assert.equal(html.getAttribute('data-rfdm-compact-profiles'), 'false');
  assert.equal(html.getAttribute('data-rfdm-hide-signatures'), 'false');
  stop(); h.dispose();
});
test('turning both appearance features off avoids page annotations until one is enabled', async () => {
  const h = page('thread', { 'rfdm.enabled': false, 'rfdm.clutterEnabled': false });
  const stop = h.api.controller.start(h.document, h.window); await h.flush();
  assert.equal(h.document.querySelectorAll('[data-rfdm-role]').length, 0);
  await h.api.settings.save({ clutterEnabled: true }); await h.flush();
  assert.ok(h.document.querySelectorAll('[data-rfdm-role]').length > 0);
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
test('startup starts loading settings while the document is still parsing', () => {
  const h = page('list-card');
  Object.defineProperty(h.document, 'readyState', { configurable: true, value: 'loading' });
  const originalLoad = h.api.settings.load;
  let reads = 0;
  h.api.settings.load = () => { reads++; return originalLoad(); };
  const stop = h.api.controller.start(h.document, h.window);
  assert.equal(reads, 1);
  stop(); h.dispose();
});
