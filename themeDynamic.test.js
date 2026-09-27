const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadThemeFixture } = require('./test/helpers/themeHarness.cjs');
const scripts = ['js/theme/dom.js','js/theme/adapters.js','js/theme/list.js','js/theme/thread.js','js/theme/controller.js'];
test('supported shell added after startup is enhanced', async () => {
  const h = loadThemeFixture('unsupported', { scripts });
  const stop = h.api.controller.start(h.document, h.window); await h.flush();
  const donor = loadThemeFixture('list-card');
  h.document.querySelector('#site_content').replaceWith(h.document.importNode(donor.document.querySelector('#site_content'), true));
  await h.flush();
  assert.equal(h.api.controller.getStatus().page, 'list');
  assert.equal(h.document.querySelector('li.topic-card').getAttribute('data-rfdm-role'), 'deal-row');
  stop(); donor.dispose(); h.dispose();
});
test('new content inside an existing post is enhanced', async () => {
  const h = loadThemeFixture('thread', { url: 'https://forums.redflagdeals.com/example-1/', scripts });
  const stop = h.api.controller.start(h.document, h.window); await h.flush();
  const stats = h.document.createElement('dd'); stats.className = 'profile_numposts';
  h.document.querySelector('.post_profilearea').append(stats); await h.flush();
  assert.equal(stats.getAttribute('data-rfdm-role'), 'profile-stats');
  stop(); h.dispose();
});
test('added deal rows remain marked for cleanup when layout is disabled', async () => {
  const h = loadThemeFixture('list-card', { scripts });
  const stop = h.api.controller.start(h.document,h.window); await h.flush();
  const row = h.document.querySelector('li.topic-card').cloneNode(true); row.dataset.threadId='3'; for (const el of [row, ...row.querySelectorAll('[data-rfdm-role]')]) el.removeAttribute('data-rfdm-role');
  h.document.querySelector('#forum-topics ul').append(row); await h.flush();
  assert.equal(row.getAttribute('data-rfdm-role'),'deal-row');
  await h.api.settings.save({enabled:false}); await h.flush();
  assert.equal(row.getAttribute('data-rfdm-role'),'deal-row');
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-enabled'), false);
  assert.equal(h.document.querySelectorAll('[data-rfdm-owned]').length,0);
  stop(); h.dispose();
});
test('new promotions outside the deal list receive the hide marker', async () => {
  const h = loadThemeFixture('list-card', { scripts });
  const stop = h.api.controller.start(h.document,h.window); await h.flush();
  const ad = h.document.createElement('aside');
  ad.className = 'ad_box';
  h.document.querySelector('#site_content').append(ad); await h.flush();
  assert.equal(ad.getAttribute('data-rfdm-role'), 'promotion');
  stop(); h.dispose();
});
test('unsupported replacement restores native appearance', async () => {
  const h = loadThemeFixture('list-card', { scripts });
  const stop = h.api.controller.start(h.document,h.window); await h.flush();
  h.document.querySelector('#forum-topics').remove(); await h.flush();
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-enabled'),false);
  assert.equal(h.api.controller.getStatus().reason,'unsupported');
  stop(); h.dispose();
});
test('root replacement during a queued insertion restores native view', async () => {
  const h = loadThemeFixture('list-card', { scripts });
  const frames = [];
  h.window.requestAnimationFrame = callback => { frames.push(callback); return frames.length; };
  const stop = h.api.controller.start(h.document,h.window); await h.flush();
  const root = h.document.querySelector('#forum-topics');
  const row = root.querySelector('li.topic-card').cloneNode(true);
  root.querySelector('ul').append(row);
  await new Promise(resolve => h.window.setTimeout(resolve, 0));
  assert.ok(frames.length > 0);
  root.remove();
  await new Promise(resolve => h.window.setTimeout(resolve, 0));
  while (frames.length) frames.shift()();
  assert.equal(h.document.documentElement.hasAttribute('data-rfdm-enabled'), false);
  assert.equal(h.api.controller.getStatus().reason, 'unsupported');
  stop(); h.dispose();
});
