const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const { stripRedirect } = require('./js/stripRedirect.js');
const rules = require('./redirects.json');

function anchor(href, eligible = true) {
  return { nodeType: 1, href, eligible,
    matches() { return this.eligible; }, querySelectorAll() { return []; } };
}

function start(links, redirects = rules) {
  let observer;
  let listener;
  let requests = 0;
  vm.runInNewContext(readFileSync('js/content.js', 'utf8'), {
    document: { querySelectorAll: () => links, documentElement: {} },
    MutationObserver: class {
      constructor(callback) { observer = callback; }
      observe() {}
      disconnect() {}
    },
    chrome: { runtime: {
      sendMessage(message, callback) { requests++; callback({ redirects }); },
      onMessage: { addListener(callback) { listener = callback; } },
    } }, stripRedirect, console,
  });
  return { mutate(records) { observer?.(records); },
    message(value) { listener?.(value, {}, () => {}); },
    get requests() { return requests; },
    activity() { let response; listener?.({ type: 'getActivity' }, {}, value => { response = value; }); return response; } };
}

test('cleans links inserted after startup, including nested anchors', () => {
  const initial = anchor('https://www.amazon.ca/dp/TEST?tag=rfd');
  const page = start([initial]);
  assert.equal(initial.href, 'https://www.amazon.ca/dp/TEST');
  const added = anchor('https://www.amazon.ca/dp/NEW?tag=rfd');
  const nested = anchor('https://www.amazon.ca/dp/NESTED?tag=rfd');
  page.mutate([{ type: 'childList', addedNodes: [added, {
    nodeType: 1, matches: () => false, querySelectorAll: () => [nested],
  }] }]);
  assert.equal(added.href, 'https://www.amazon.ca/dp/NEW');
  assert.equal(nested.href, 'https://www.amazon.ca/dp/NESTED');
  assert.equal(page.requests, 1);
});

test('changed rules update open links and restore previous rewrites', () => {
  const original = 'https://www.amazon.ca/dp/TEST?tag=rfd';
  const link = anchor(original);
  const page = start([link]);
  assert.equal(link.href, 'https://www.amazon.ca/dp/TEST');
  page.message({ type: 'redirectRulesUpdated', redirects: [] });
  assert.equal(link.href, original);
  page.message({ type: 'redirectRulesUpdated', redirects: rules });
  assert.equal(link.href, 'https://www.amazon.ca/dp/TEST');
});

test('cleans changed hrefs and newly eligible links without repeated writes', () => {
  const link = anchor('https://www.amazon.ca/dp/TEST');
  const page = start([link]);
  let href = 'https://www.amazon.ca/dp/OTHER?tag=rfd';
  let writes = 0;
  Object.defineProperty(link, 'href', { get: () => href, set(value) { writes++; href = value; } });
  page.mutate([{ type: 'attributes', target: link }]);
  page.mutate([{ type: 'attributes', target: link }]);
  assert.equal(href, 'https://www.amazon.ca/dp/OTHER');
  assert.equal(writes, 1);
  const other = anchor('https://www.amazon.ca/dp/NEW?tag=rfd', false);
  page.mutate([{ type: 'attributes', target: other }]);
  assert.match(other.href, /tag=/);
  other.eligible = true;
  page.mutate([{ type: 'attributes', target: other }]);
  assert.equal(other.href, 'https://www.amazon.ca/dp/NEW');
});

test('activity counts distinct cleaned links and keeps bounded recent details', () => {
  const links = Array.from({ length: 55 }, (_, i) => anchor(`https://www.amazon.ca/dp/ITEM${i}?tag=rfd`));
  const page = start(links);
  const activity = page.activity();
  assert.ok(activity, 'content script should answer activity requests');
  assert.equal(activity.count, 55);
  assert.equal(activity.links.length, 50);
  assert.equal(activity.links.at(-1).original, 'https://www.amazon.ca/dp/ITEM54?tag=rfd');
  assert.equal(activity.links.at(-1).cleaned, 'https://www.amazon.ca/dp/ITEM54');
  links[0].href = 'https://www.amazon.ca/dp/CHANGED?tag=rfd';
  page.mutate([{ type: 'attributes', target: links[0] }]);
  assert.equal(page.activity().count, 55);
  assert.equal(page.activity().links.at(-1).cleaned, 'https://www.amazon.ca/dp/CHANGED');
  assert.equal(start([]).activity().count, 0);
});

test('observer feedback cannot restart an expanding rule after its step limit', () => {
  const link = anchor('https://shop.com/x');
  const page = start([link], [{ pattern: '(?=(?<baseUrl>https://shop.com/.*))https://shop.com/(?<rest>x)' }]);
  const bounded = link.href;
  for (let i = 0; i < 3; i++) page.mutate([{ type: 'attributes', target: link }]);
  assert.equal(link.href, bounded);
  assert.equal(page.activity().links.length, 1);
});
