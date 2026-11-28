export const DEFAULT_CONFIG_URL = 'https://raw.githubusercontent.com/davegallant/rfd-enhancement-suite/main/redirects.json';

export async function dbSet(key, value) {
  return dbSetMany({ [key]: value });
}

export async function dbGet(key) {
  return (await chrome.storage.local.get(key))[key];
}

async function dbSetMany(values) {
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
      if (rule.hostPattern !== undefined && (typeof rule.hostPattern !== 'string' || !rule.hostPattern)) throw new Error('hostPattern must be a non-empty string');
      if (rule.hostPattern !== undefined) new RegExp(rule.hostPattern);
      if (rule.pathPattern !== undefined && (typeof rule.pathPattern !== 'string' || !rule.pathPattern)) throw new Error('pathPattern must be a non-empty string');
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
  if (existing) return;
  await dbSet(
    "config",
    DEFAULT_CONFIG_URL
  );
}
