const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { readFileSync } = require('node:fs');
function popup(initial = {}, options = {}) {
  const dom = new JSDOM(readFileSync('html/popup.html','utf8'), { url: 'chrome-extension://example/html/popup.html', runScripts: 'outside-only' });
  const w = dom.window, data = { ...initial }, listeners = new Set();
  w.chrome = { storage: { local: {
    async get(keys) { const names = Array.isArray(keys) ? keys : [keys]; return Object.fromEntries(names.filter(k => k in data).map(k => [k, data[k]])); },
    async set(patch) { if (options.failWrite) throw Error('save failed'); const changes = {}; for (const [k,v] of Object.entries(patch)) { changes[k] = { oldValue:data[k], newValue:v }; data[k] = v; } for (const fn of listeners) fn(changes,'local'); },
    async remove(keys) { for (const k of keys) delete data[k]; },
  }, onChanged: { addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); } } },
  tabs: { query: async () => [{id:42}], sendMessage: async () => options.status || { enabled:true, applied:true, page:'list', reason:null } } };
  w.eval(readFileSync('js/theme/settings.js','utf8'));
  w.eval(readFileSync('js/popupAppearance.js','utf8'));
  return { document:w.document, data, async flush() { await new Promise(r=>w.setTimeout(r, 10)); }, dispose() { dom.window.close(); } };
}
test('popup displays default-on layout improvements and saves off without touching rules', async () => {
  const p = popup({config:'keep'}); await p.flush();
  assert.equal(p.document.querySelector('#modern-enabled').checked, true);
  assert.equal(p.document.querySelector('#modern-theme'), null);
  assert.equal(p.document.querySelector('#modern-density'), null);
  assert.equal(p.document.querySelector('#modern-content-width'), null);
  assert.equal(p.document.querySelector('#modern-font-size'), null);
  assert.equal(p.document.querySelector('#appearance-page-status').textContent, '');
  const input = p.document.querySelector('#modern-enabled'); input.checked = false; input.dispatchEvent(new p.document.defaultView.Event('change', {bubbles:true}));
  await p.flush(); assert.equal(p.data['rfdm.enabled'], false); assert.equal(p.data.config, 'keep'); p.dispose();
});
test('layout and clutter controls can be changed independently', async () => {
  const p = popup(); await p.flush();
  const layout = p.document.querySelector('#modern-enabled');
  const clutter = p.document.querySelector('#modern-clutter-enabled');
  assert.equal(clutter.checked, true);
  assert.equal(p.document.querySelector('#modern-hide-footer').checked, true);
  layout.checked = false; layout.dispatchEvent(new p.document.defaultView.Event('change'));
  await p.flush();
  assert.equal(clutter.disabled, false);
  assert.equal(p.document.querySelector('#modern-hide-promotions').disabled, false);
  clutter.checked = false; clutter.dispatchEvent(new p.document.defaultView.Event('change'));
  await p.flush();
  assert.equal(p.data['rfdm.clutterEnabled'], false);
  assert.equal(p.document.querySelector('#modern-hide-promotions').disabled, true);
  assert.equal(p.document.querySelector('#modern-hide-footer').disabled, true);
  p.dispose();
});
test('popup reports unsupported page and failed saves', async () => {
  const p = popup({}, { status: { enabled:true, applied:false, page:'unsupported', reason:'unsupported' }, failWrite:true }); await p.flush();
  assert.match(p.document.querySelector('#appearance-page-status').textContent, /unavailable on this page/);
  const input=p.document.querySelector('#modern-enabled'); input.checked=false; input.dispatchEvent(new p.document.defaultView.Event('change'));
  await p.flush(); assert.match(p.document.querySelector('#appearance-status').textContent, /save failed/); p.dispose();
});
