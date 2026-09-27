(() => {
  const api = globalThis.RFDModern ||= {};
  const DEFAULTS = Object.freeze({ enabled: true, clutterEnabled: true, fontSize: 18, hidePromotions: true, hideSidebar: true, hideSignatures: true, compactProfiles: true });
  const PREFIX = 'rfdm.';
  const names = Object.keys(DEFAULTS);
  const allKeys = names.map(name => PREFIX + name);
  const validators = {
    enabled: value => typeof value === 'boolean',
    clutterEnabled: value => typeof value === 'boolean',
    fontSize: value => Number.isInteger(value) && value >= 16 && value <= 24,
    hidePromotions: value => typeof value === 'boolean',
    hideSidebar: value => typeof value === 'boolean',
    hideSignatures: value => typeof value === 'boolean',
    compactProfiles: value => typeof value === 'boolean',
  };
  function normalize(raw) {
    const out = { ...DEFAULTS };
    if (!raw || typeof raw !== 'object') return out;
    for (const name of names) if (validators[name](raw[name])) out[name] = raw[name];
    return out;
  }
  async function load() {
    const raw = await chrome.storage.local.get([...allKeys, PREFIX + 'schemaVersion']);
    if (raw[PREFIX + 'schemaVersion'] > 2) return normalize();
    const values = Object.fromEntries(names.map(name => [name, raw[PREFIX + name]]));
    if (raw[PREFIX + 'schemaVersion'] === 1) {
      if (values.hideSignatures === undefined) values.hideSignatures = false;
      if (values.compactProfiles === undefined) values.compactProfiles = false;
    }
    return normalize(values);
  }
  async function save(patch) {
    if (!patch || typeof patch !== 'object' || !Object.keys(patch).length || Object.keys(patch).some(name => !validators[name]?.(patch[name]))) throw new Error('Invalid appearance settings');
    const raw = await chrome.storage.local.get(PREFIX + 'schemaVersion');
    const version = raw[PREFIX + 'schemaVersion'] === 1 ? 1 : 2;
    await chrome.storage.local.set(Object.fromEntries([...Object.entries(patch).map(([name, value]) => [PREFIX + name, value]), [PREFIX + 'schemaVersion', version]]));
  }
  async function reset() { await chrome.storage.local.remove([...allKeys, PREFIX + 'theme', PREFIX + 'density', PREFIX + 'contentWidth', PREFIX + 'schemaVersion']); }
  function subscribe(fn) {
    let current = null;
    let pending = {};
    let active = true;
    const listener = (changes, area) => {
      if (!active || area !== 'local') return;
      const patch = {};
      for (const name of names) if (Object.hasOwn(changes, PREFIX + name)) patch[name] = changes[PREFIX + name].newValue;
      if (!Object.keys(patch).length) return;
      if (current === null) pending = { ...pending, ...patch };
      else { current = normalize({ ...current, ...patch }); fn(current); }
    };
    chrome.storage.onChanged.addListener(listener);
    load().catch(() => normalize()).then(value => {
      if (!active) return;
      current = normalize({ ...value, ...pending });
      if (Object.keys(pending).length) fn(current);
      pending = {};
    });
    return () => { active = false; chrome.storage.onChanged.removeListener(listener); };
  }
  api.settings = { DEFAULTS, normalize, load, save, reset, subscribe };
})();
