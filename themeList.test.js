const { test } = require('node:test');
const assert = require('node:assert/strict');
const { loadThemeFixture } = require('./test/helpers/themeHarness.cjs');
const scripts = ['js/theme/dom.js', 'js/theme/adapters.js', 'js/theme/list.js'];
function fixture() { return loadThemeFixture('list-card', { scripts }); }
test('marks deal rows without changing links, order or existing handlers', () => {
  const h = fixture(), root = h.document.querySelector('#forum-topics');
  const before = [...root.querySelectorAll('a.topic-card-info')];
  let clicked = 0; before[0].addEventListener('click', () => clicked++);
  const journal = h.api.dom.createJournal();
  h.api.list.enhance(root, h.api.settings.DEFAULTS, journal);
  h.api.list.enhance(root, h.api.settings.DEFAULTS, journal);
  const after = [...root.querySelectorAll('a.topic-card-info')];
  assert.deepEqual(after, before); after[0].click(); assert.equal(clicked, 1);
  assert.equal(root.querySelectorAll('[data-rfdm-role="deal-row"]').length, 2);
  assert.equal(after[0].href, 'https://forums.redflagdeals.com/example-1/');
  journal.restore(); assert.equal(root.querySelectorAll('[data-rfdm-role]').length, 0); h.dispose();
});
test('does not label organic row or a title mentioning an ad as promotion', () => {
  const h = fixture(), root = h.document.querySelector('#forum-topics');
  root.querySelector('.thread_title').textContent = 'ad free music';
  const ad = h.document.createElement('li'); ad.className = 'ad_sponsored_deal'; ad.textContent = 'Sponsored'; root.querySelector('ul').append(ad);
  const journal = h.api.dom.createJournal(); h.api.list.enhance(root, h.api.settings.DEFAULTS, journal);
  assert.equal(ad.getAttribute('data-rfdm-role'), 'promotion');
  assert.equal(root.querySelector('li.topic-card').getAttribute('data-rfdm-role'), 'deal-row');
  assert.equal(root.querySelectorAll('[data-rfdm-role="promotion"]').length, 1);
  h.dispose();
});
test('new row root and nested row are both enhanced', () => {
  const h = fixture(), root = h.document.querySelector('#forum-topics');
  const journal = h.api.dom.createJournal();
  const row = root.querySelector('li.topic-card').cloneNode(true); row.removeAttribute('data-rfdm-role');
  h.api.list.enhance(row, h.api.settings.DEFAULTS, journal);
  assert.equal(row.getAttribute('data-rfdm-role'), 'deal-row');
  const wrap = h.document.createElement('ul'); wrap.append(row);
  h.api.list.enhance(wrap, h.api.settings.DEFAULTS, journal);
  assert.equal(row.getAttribute('data-rfdm-role'), 'deal-row'); h.dispose();
});
test('verified sponsored card is hidden as one placement while organic cards remain', () => {
  const h = fixture(), root = h.document.querySelector('#forum-topics');
  const sponsored = root.querySelector('li.topic-card').cloneNode(true);
  sponsored.querySelector('a.topic-card-info').classList.add('sponsored-offer');
  sponsored.querySelector('.thread_info_block').insertAdjacentHTML('beforeend','<span class="sponsored-badge">Sponsored</span>');
  root.querySelector('ul').append(sponsored);
  const journal = h.api.dom.createJournal(); h.api.list.enhance(root,h.api.settings.DEFAULTS,journal);
  assert.equal(sponsored.getAttribute('data-rfdm-sponsored'),'true');
  assert.equal(root.querySelector('li.topic-card').getAttribute('data-rfdm-role'),'deal-row');
  h.dispose();
});
