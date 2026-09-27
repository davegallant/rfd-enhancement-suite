const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadThemeFixture } = require('./test/helpers/themeHarness.cjs');
function start(options) { return loadThemeFixture('list-card', options); }
test('missing and corrupt settings use safe defaults', async () => {
  const h = start({ initial: { 'rfdm.enabled': 'true', 'rfdm.theme': 'sepia', 'rfdm.fontSize': 15, 'rfdm.hidePromotions': false } });
  const settings = await h.api.settings.load();
  assert.equal(settings.enabled, true);
  assert.equal('theme' in settings, false);
  assert.equal(settings.fontSize, 18);
  assert.equal(settings.hidePromotions, false);
  assert.equal('density' in settings, false);
  assert.equal('contentWidth' in settings, false);
  assert.equal(Object.keys(h.storage).length, 4);
  h.dispose();
});
test('saves independent preferences and rejects invalid patches', async () => {
  const h = start({ initial: { config: 'old' } });
  await Promise.all([h.api.settings.save({ fontSize: 22 }), h.api.settings.save({ hideSidebar: false })]);
  assert.equal(h.storage['rfdm.fontSize'], 22);
  assert.equal(h.storage['rfdm.hideSidebar'], false);
  assert.equal(h.storage.config, 'old');
  await assert.rejects(h.api.settings.save({ theme: 'dark' }), /Invalid/);
  await assert.rejects(h.api.settings.save({ density: 'compact' }), /Invalid/);
  await assert.rejects(h.api.settings.save({ contentWidth: 'wide' }), /Invalid/);
  await assert.rejects(h.api.settings.save({ fontSize: 25 }), /Invalid/);
  assert.equal(h.storage['rfdm.fontSize'], 22);
  h.dispose();
});
test('reset affects appearance only and subscription ignores unrelated changes', async () => {
  const h = start({ initial: { config: 'old', 'rfdm.enabled': true } });
  const events = [];
  const stop = h.api.settings.subscribe(value => events.push(value));
  await h.window.chrome.storage.local.set({ config: 'new' });
  assert.equal(events.length, 0);
  await h.window.chrome.storage.local.set({ 'rfdm.fontSize': 20 });
  await h.flush();
  assert.equal(events.at(-1).fontSize, 20);
  await h.window.chrome.storage.local.set({ 'rfdm.theme': 'light', 'rfdm.density': 'compact', 'rfdm.contentWidth': 'wide' });
  await h.api.settings.reset();
  assert.equal(h.storage.config, 'new');
  assert.equal(h.storage['rfdm.theme'], undefined);
  assert.equal(h.storage['rfdm.density'], undefined);
  assert.equal(h.storage['rfdm.contentWidth'], undefined);
  assert.equal((await h.api.settings.load()).enabled, true);
  stop(); h.dispose();
});
test('storage failures reject', async () => {
  const h = start({ failRead: true });
  await assert.rejects(h.api.settings.load(), /unavailable/);
  h.dispose();
  const w = start({ failWrite: true });
  await assert.rejects(w.api.settings.save({ enabled: true }), /unavailable/);
  w.dispose();
});
test('a partial storage change retains all previously saved preferences', async () => {
  const h = start({ initial: { 'rfdm.enabled': false, 'rfdm.hideSidebar': false, 'rfdm.hidePromotions': false } });
  const events = [];
  const stop = h.api.settings.subscribe(value => events.push(value));
  await h.flush();
  await h.api.settings.save({ fontSize: 22 });
  assert.equal(events.at(-1).enabled, false);
  assert.equal(events.at(-1).hideSidebar, false);
  assert.equal(events.at(-1).hidePromotions, false);
  assert.equal(events.at(-1).fontSize, 22);
  stop(); h.dispose();
});
