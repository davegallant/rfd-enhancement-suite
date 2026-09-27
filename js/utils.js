// Extension settings with a one-time migration from the pre-1.1 IndexedDB store.
const DB_NAME = 'rfdAffiliateStripperDB';
const STORE_NAME = 'config';
const DB_VERSION = 1;
export const DEFAULT_CONFIG_URL = 'https://raw.githubusercontent.com/davegallant/rfd-enhancement-suite/main/redirects.json';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

async function legacyGet(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = (event) => resolve(event.target.result?.value);
    transaction.oncomplete = () => db.close();
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function dbSet(key, value) {
  return dbSetMany({ [key]: value });
}

let migration;
function migrate() {
  migration ||= (async () => {
    const current = await chrome.storage.local.get(null);
    if (current.rulesStorageVersion === 1) return;
    const values = { rulesStorageVersion: 1 };
    for (const key of ['config', 'redirects', 'updateStatus']) {
      if (Object.hasOwn(current, key)) continue;
      try {
        const old = await legacyGet(key);
        if (old !== undefined) values[key] = old;
      } catch { /* New installs and unavailable legacy storage need no migration. */ }
    }
    await chrome.storage.local.set(values);
  })().catch(error => { migration = null; throw error; });
  return migration;
}

export async function dbGet(key) {
  await migrate();
  return (await chrome.storage.local.get(key))[key];
}

async function dbSetMany(values) {
  await migrate();
  await chrome.storage.local.set(values);
  return true;
}

export function validateRedirects(redirects) {
  if (!Array.isArray(redirects)) throw new Error('Config must be a JSON array');
  for (const [index, rule] of redirects.entries()) {
    try {
      const structured = typeof rule?.host === 'string' || Array.isArray(rule?.hosts) || Array.isArray(rule?.hostSuffixes) || typeof rule?.hostPattern === 'string';
      if (typeof rule?.pattern !== 'string' && !structured) throw new Error('Missing pattern or host');
      if (rule.host !== undefined && (typeof rule.host !== 'string' || !rule.host)) throw new Error('host must be a non-empty string');
      if (rule.hosts !== undefined && (!Array.isArray(rule.hosts) || !rule.hosts.length || !rule.hosts.every(host => typeof host === 'string' && host))) throw new Error('hosts must be non-empty strings');
      if (rule.hostSuffixes !== undefined && (!Array.isArray(rule.hostSuffixes) || !rule.hostSuffixes.length || !rule.hostSuffixes.every(host => typeof host === 'string' && host))) throw new Error('hostSuffixes must be non-empty strings');
      if (rule.hostPattern !== undefined && typeof rule.hostPattern !== 'string') throw new Error('hostPattern must be a string');
      if (rule.hostPattern !== undefined) new RegExp(rule.hostPattern);
      if (rule.pathPattern !== undefined && typeof rule.pathPattern !== 'string') throw new Error('pathPattern must be a string');
      if (rule.pathPattern !== undefined) new RegExp(rule.pathPattern);
      if (structured && !rule.destinationParam && !rule.removeParams && !rule.removePathRef) throw new Error('Structured rule needs an operation');
      if (rule.destinationParam !== undefined && (typeof rule.destinationParam !== 'string' || !rule.destinationParam)) {
        throw new Error('destinationParam must be a non-empty string');
      }
      if (rule.removeParams !== undefined && (!Array.isArray(rule.removeParams) || !rule.removeParams.every(key => typeof key === 'string'))) {
        throw new Error('removeParams must be an array of strings');
      }
      if (rule.removePathRef !== undefined && typeof rule.removePathRef !== 'boolean') {
        throw new Error('removePathRef must be a boolean');
      }
      // An empty alternative exposes named groups even when the rule does not match.
      if (rule.pattern !== undefined) {
        const groups = new RegExp(`(?:${rule.pattern})|`).exec('').groups;
        if (!groups || !Object.hasOwn(groups, 'baseUrl')) throw new Error('Missing baseUrl capture group');
      }
    } catch (error) {
      throw new Error(`Rule ${index + 1}: ${error.message}`);
    }
  }
  return redirects;
}

let updateQueue = Promise.resolve();
export function updateRedirects(configUrl) {
  const pending = updateQueue.then(() => performUpdate(configUrl));
  updateQueue = pending.catch(() => {});
  return pending;
}

async function performUpdate(configUrl) {
  try {
    configUrl = configUrl || await dbGet('config') || DEFAULT_CONFIG_URL;
    const parsed = new URL(configUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an HTTP or HTTPS config URL');
    const res = await fetch(configUrl);
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    const redirects = validateRedirects(await res.json());
    let previousRedirects;
    try { previousRedirects = await dbGet('redirects'); } catch { /* Refresh can still proceed. */ }
    await dbSetMany({ config: configUrl, redirects,
      updateStatus: { lastSuccess: new Date().toISOString(), error: null } });
    if (JSON.stringify(previousRedirects) !== JSON.stringify(redirects) && chrome.tabs?.query && chrome.tabs?.sendMessage) {
      try {
        const tabs = await chrome.tabs.query({});
        await Promise.allSettled(tabs.filter(tab => Number.isInteger(tab.id)).map(tab =>
          chrome.tabs.sendMessage(tab.id, { type: 'redirectRulesUpdated', redirects })));
      } catch (error) {
        console.warn('Could not notify open forum tabs of updated rules:', error);
      }
    }
    return redirects;
  } catch (error) {
    try {
      const previous = await dbGet('updateStatus');
      await dbSet('updateStatus', { lastSuccess: previous?.lastSuccess || null, error: error.message });
    } catch { /* Keep the original update error when storage is unavailable. */ }
    throw error;
  }
}

export async function getRedirects() {
  try {
    const cached = await dbGet('redirects');
    if (cached !== undefined) return validateRedirects(cached);
  } catch (error) {
    console.log('Could not read cached redirects:', error.message);
  }
  const response = await fetch(chrome.runtime.getURL('redirects.json'));
  if (!response.ok) throw new Error('Could not load bundled redirects');
  return validateRedirects(await response.json());
}

export async function setDefaultConfig(reset = true) {
  const existing = reset ? null : await dbGet('config');
  const oldDefault = 'https://raw.githubusercontent.com/davegallant/rfd-affiliate-stripper/main/redirects.json';
  if (existing && existing !== oldDefault) return;
  await dbSet(
    "config",
    DEFAULT_CONFIG_URL
  );
}
