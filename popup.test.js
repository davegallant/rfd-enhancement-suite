const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const cleaner = require('./js/stripRedirect.js');

function element() {
  return { textContent: '', value: '', children: [], listeners: {},
    classList: { add() {} },
    append(...items) { this.children.push(...items); },
    replaceChildren(...items) { this.children = items; },
    addEventListener(event, callback) { this.listeners[event] = callback; },
  };
}

async function popup({ activity, status, unavailable = false } = {}) {
  const elements = new Map();
  const ruleMessages = [];
  const context = vm.createContext({ console, URL, Date,
    setTimeout: () => 0, clearTimeout() {},
    document: {
      getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
      createElement: () => element(),
    },
    dbGet: async key => key === 'updateStatus' ? status : undefined,
    DEFAULT_CONFIG_URL: 'https://example.com/rules', updateRedirects: async () => [],
    getRedirects: async () => [{ name: 'Remove tag', pattern: '(?<baseUrl>https://shop.com/item)\\?tag=.*' }],
    RFDStripRedirect: { inspectRedirect: cleaner.inspectRedirect },
    chrome: { tabs: {
      query: async () => [{ id: 42 }],
      sendMessage: async (id, message) => {
        assert.equal(id, 42); assert.equal(message.type, 'getActivity');
        if (unavailable) throw new Error('No receiver');
        return activity;
      },
    }, runtime: { sendMessage: async message => { ruleMessages.push(message); return { redirects: [] }; } } },
  });
  vm.runInContext(readFileSync('js/popup.js', 'utf8').replace(/^import .*$/gm, ''), context);
  await new Promise(resolve => setImmediate(resolve));
  return { elements, context, ruleMessages };
}

test('saving a rules source delegates update to the background', async () => {
  const { elements, ruleMessages } = await popup({ unavailable: true });
  elements.get('input-field').value = 'https://example.com/custom.json';
  await elements.get('save-button').listeners.click();
  assert.equal(ruleMessages[0].type, 'updateRedirects');
  assert.equal(ruleMessages[0].configUrl, 'https://example.com/custom.json');
});

test('popup displays count, original/destination details, and update failure', async () => {
  const { elements } = await popup({ activity: { count: 2, links: [
    { original: 'https://track.com/<script>', cleaned: 'https://shop.com/item' },
  ] }, status: { lastSuccess: '2026-06-01T12:00:00Z', error: 'offline' } });
  assert.match(elements.get('activity-count')?.textContent || '', /2 links cleaned/);
  const details = elements.get('activity-links');
  assert.equal(details.children.length, 1);
  assert.match(details.children[0].textContent, /https:\/\/track.com\/<script>/);
  assert.match(details.children[0].textContent, /https:\/\/shop.com\/item/);
  assert.match(elements.get('update-error').textContent, /offline/);
  assert.match(elements.get('last-update').textContent, /2026/);
});

test('popup handles non-RFD tabs and a fresh offline installation', async () => {
  const { elements } = await popup({ unavailable: true });
  assert.match(elements.get('activity-count')?.textContent || '', /Open an RFD/);
  assert.match(elements.get('last-update')?.textContent || '', /No successful/);
});

test('link tester renders a cleaned destination and applied rules without navigation', async () => {
  const { elements } = await popup({ unavailable: true });
  const input = elements.get('test-url');
  assert.ok(input, 'popup should offer a link tester');
  input.value = 'https://shop.com/item?tag=rfd';
  await elements.get('test-form').listeners.submit({ preventDefault() {} });
  assert.equal(elements.get('test-result').textContent, 'https://shop.com/item');
  assert.match(elements.get('test-steps').children[0].textContent, /Remove tag/);
  input.value = 'javascript:alert(1)';
  await elements.get('test-form').listeners.submit({ preventDefault() {} });
  assert.match(elements.get('test-result').textContent, /HTTP/);
  assert.equal(elements.get('test-steps').children.length, 0);
});
