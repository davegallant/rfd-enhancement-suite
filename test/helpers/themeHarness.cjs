const { JSDOM } = require('jsdom');
const { readFileSync } = require('node:fs');
function loadThemeFixture(name, options = {}) {
  const html = readFileSync(`test/fixtures/rfd/${name}.html`, 'utf8');
  const dom = new JSDOM(html, { url: options.url || 'https://forums.redflagdeals.com/hot-deals-f9/', runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  const data = { ...options.initial };
  const listeners = new Set();
  const messageListeners = new Set();
  window.chrome = { storage: {
    local: {
      async get(keys) { if (options.failRead) throw Error('storage unavailable'); const names = Array.isArray(keys) ? keys : [keys]; return Object.fromEntries(names.filter(key => key in data).map(key => [key, data[key]])); },
      async set(patch) { if (options.failWrite) throw Error('storage unavailable'); const changes = {}; for (const [key, value] of Object.entries(patch)) { changes[key] = { oldValue: data[key], newValue: value }; data[key] = value; } for (const listener of listeners) listener(changes, 'local'); },
      async remove(keys) { const changes = {}; for (const key of keys) { changes[key] = { oldValue: data[key] }; delete data[key]; } for (const listener of listeners) listener(changes, 'local'); },
    },
    onChanged: { addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); } },
  }, runtime: { onMessage: { addListener(fn) { messageListeners.add(fn); }, removeListener(fn) { messageListeners.delete(fn); } } } };
  let dark = false;
  const mediaListeners = new Set();
  window.matchMedia = () => ({ get matches() { return dark; }, addEventListener(_, fn) { mediaListeners.add(fn); }, removeEventListener(_, fn) { mediaListeners.delete(fn); } });
  window.eval(readFileSync('js/theme/settings.js', 'utf8'));
  for (const path of options.scripts || []) window.eval(readFileSync(path, 'utf8'));
  return { window, document: window.document, api: window.RFDModern, storage: data,
    async flush() { await new Promise(resolve => window.setTimeout(resolve, 30)); },
    setDark(value) { dark = value; for (const fn of mediaListeners) fn({ matches: value }); },
    messages: messageListeners, dispose() { dom.window.close(); }, };
}
module.exports = { loadThemeFixture };
