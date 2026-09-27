const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup(values = {}, failDB = false) {
  const data = new Map(Object.entries(values));
  const bundled = [{ name: 'Bundled', pattern: '(?<baseUrl>https://example.com)' }];
  const context = vm.createContext({ console, URL, Date, chrome: { runtime: { getURL: path => `extension://${path}` } },
    fetch: async url => {
      assert.equal(url, 'extension://redirects.json');
      return { ok: true, json: async () => bundled };
    },
    indexedDB: { open() {
      const request = {};
      queueMicrotask(() => {
        if (failDB) return request.onerror({ target: { error: new Error('unavailable') } });
        request.onsuccess({ target: { result: {
          close() {},
          transaction() { const transaction = { objectStore() { return {
            get(key) { const req = {}; queueMicrotask(() => {
              req.onsuccess({ target: { result: data.has(key) ? { value: data.get(key) } : undefined } });
              transaction.oncomplete?.();
            }); return req; },
            put({ key, value }) { const req = {}; queueMicrotask(() => {
              data.set(key, value); req.onsuccess?.(); transaction.oncomplete?.();
            }); return req; },
          }; } }; return transaction; },
        } } });
      });
      return request;
    } },
  });
  vm.runInContext(readFileSync('js/utils.js', 'utf8').replaceAll('export ', ''), context);
  return { context, data, bundled };
}

test('serves bundled rules without a network request on a fresh installation', async () => {
  const { context, bundled } = setup();
  assert.equal(typeof context.getRedirects, 'function');
  assert.deepEqual(await context.getRedirects(), bundled);
});

test('serves cached rules, including an intentionally empty configuration', async () => {
  for (const cached of [[], [{ name: 'Custom', pattern: '(?<baseUrl>https://shop.com)' }]]) {
    const { context } = setup({ redirects: cached });
    assert.equal(typeof context.getRedirects, 'function');
    assert.deepEqual(await context.getRedirects(), cached);
  }
});

test('falls back to bundled rules when storage is unavailable', async () => {
  const { context, bundled } = setup({}, true);
  assert.equal(typeof context.getRedirects, 'function');
  assert.deepEqual(await context.getRedirects(), bundled);
});

test('initialization preserves an existing custom config URL', async () => {
  const { context, data } = setup({ config: 'https://example.com/custom.json' });
  await context.setDefaultConfig(false);
  assert.equal(data.get('config'), 'https://example.com/custom.json');
});

test('invalid remote rules retain the last valid config and record an error', async () => {
  const oldRules = [{ name: 'Valid', pattern: '(?<baseUrl>https://shop.com)' }];
  for (const invalid of [{}, [null], [{ pattern: '[' }], [{ pattern: '(https://shop.com)' }],
    [{ pattern: '\\(?<baseUrl>literal' }],
    [{ pattern: '(?<baseUrl>.*)', removeParams: 'tag' }],
    [{ pattern: '(?<baseUrl>.*)', destinationParam: 5 }],
    [{ pattern: '(?<baseUrl>.*)', removePathRef: 'yes' }]]) {
    const { context, data } = setup({ config: 'https://old.com/rules', redirects: oldRules,
      updateStatus: { lastSuccess: '2026-01-01T00:00:00.000Z' } });
    context.fetch = async () => ({ ok: true, json: async () => invalid });
    await assert.rejects(context.updateRedirects('https://new.com/rules'));
    assert.equal(data.get('config'), 'https://old.com/rules');
    assert.equal(data.get('redirects'), oldRules);
    assert.equal(data.get('updateStatus').lastSuccess, '2026-01-01T00:00:00.000Z');
    assert.ok(data.get('updateStatus').error);
  }
});

test('successful update fetches once and saves config, rules, and success status', async () => {
  const { context, data, bundled } = setup();
  let requests = 0;
  context.fetch = async url => {
    requests++; assert.equal(url, 'https://new.com/rules');
    return { ok: true, json: async () => bundled };
  };
  await context.updateRedirects('https://new.com/rules');
  assert.equal(requests, 1);
  assert.equal(data.get('config'), 'https://new.com/rules');
  assert.equal(data.get('redirects'), bundled);
  assert.ok(data.get('updateStatus').lastSuccess);
  assert.equal(data.get('updateStatus').error, null);
});

test('changed remote rules are delivered to open tabs once', async () => {
  const oldRules = [{ name: 'Old', pattern: '(?<baseUrl>https://old.com)' }];
  const nextRules = [{ name: 'New', pattern: '(?<baseUrl>https://new.com)' }];
  const { context } = setup({ redirects: oldRules });
  const deliveries = [];
  context.chrome.tabs = {
    query: async () => [{ id: 12 }, { id: 13 }],
    sendMessage: async (id, message) => { deliveries.push({ id, message }); },
  };
  context.fetch = async () => ({ ok: true, json: async () => nextRules });
  await context.updateRedirects('https://new.com/rules');
  assert.deepEqual(deliveries.map(({ id, message }) => [id, message.type, message.redirects[0].name]), [
    [12, 'redirectRulesUpdated', 'New'], [13, 'redirectRulesUpdated', 'New'],
  ]);
  deliveries.length = 0;
  await context.updateRedirects('https://new.com/rules');
  assert.equal(deliveries.length, 0);
});

test('HTTP and network errors are reported without replacing cached rules', async () => {
  for (const fetch of [async () => ({ ok: false, status: 503 }), async () => { throw new Error('offline'); }]) {
    const { context, data, bundled } = setup({ config: 'https://example.com/rules' });
    data.set('redirects', bundled);
    context.fetch = fetch;
    await assert.rejects(context.updateRedirects());
    assert.equal(data.get('redirects'), bundled);
    assert.ok(data.get('updateStatus').error);
  }
});
