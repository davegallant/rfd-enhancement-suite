function isHttpUrl(url) {
  try {
    return /^https?:\/\//i.test(url) && ['http:', 'https:'].includes(new URL(url).protocol);
  } catch { return false; }
}

function stripRedirect(url, redirectRegex) {
  if (!isHttpUrl(url)) return url;
  return inspectRedirect(url, redirectRegex).url;
}

function applyRedirectRule(input, rule, groups) {
  if (rule.destinationParam || rule.removeParams || rule.removePathRef) {
    const parsed = new URL(input);
    if (rule.destinationParam) return parsed.searchParams.get(rule.destinationParam);
    if (rule.removeParams) {
      // Filter raw pairs so retained values are never decoded or re-encoded.
      const retained = parsed.search.slice(1).split('&').filter(pair => {
        const key = new URLSearchParams(pair).keys().next().value;
        return !rule.removeParams.includes(key);
      });
      parsed.search = retained.join('&');
    }
    if (rule.removePathRef) parsed.pathname = parsed.pathname.replace(/\/ref=[^/]*$/, '');
    return parsed.href;
  }
  let destination = groups.baseUrl;
  if (groups.rest) destination += (destination.includes('?') ? '&' : '?') + groups.rest;
  if (input.startsWith(groups.baseUrl)) {
    // In-place removal is not another layer of URL encoding.
    const fragment = new URL(input).hash;
    return destination + (destination.includes('#') ? '' : fragment);
  }
  return decodeURIComponent(destination);
}

const compiledRuleSets = new WeakMap();

function compileRules(redirectRegex) {
  if (!Array.isArray(redirectRegex)) return [];
  if (compiledRuleSets.has(redirectRegex)) return compiledRuleSets.get(redirectRegex);
  const rules = [];
  for (const rule of redirectRegex) {
    try {
      if (typeof rule?.pattern === 'string' || typeof rule?.host === 'string' || Array.isArray(rule?.hosts) || Array.isArray(rule?.hostSuffixes) || typeof rule?.hostPattern === 'string') rules.push({
        regex: rule.pattern ? new RegExp(rule.pattern) : null,
        hostRegex: rule.hostPattern ? new RegExp(rule.hostPattern) : null,
        pathRegex: rule.pathPattern ? new RegExp(rule.pathPattern) : null,
        name: rule.name || 'Unnamed rule', rule,
      });
    } catch { /* Ignore invalid legacy cached rules. */ }
  }
  compiledRuleSets.set(redirectRegex, rules);
  return rules;
}

function inspectRedirect(url, redirectRegex) {
  if (!isHttpUrl(url)) throw new Error('Enter a valid HTTP or HTTPS URL');
  const steps = [];
  const seen = new Set([url]);
  const rules = compileRules(redirectRegex);
  for (let step = 0; step < 20; step++) {
    const previousURL = url;
    const parsed = new URL(url);
    for (const { regex, hostRegex, pathRegex, name, rule } of rules) {
      const hostMatch = rule.host === parsed.hostname || rule.hosts?.includes(parsed.hostname) ||
        rule.hostSuffixes?.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host)) || hostRegex?.test(parsed.hostname);
      const structured = hostMatch && (!pathRegex || pathRegex.test(parsed.pathname));
      const result = regex?.exec(url);
      if (structured || result?.groups?.baseUrl) {
        let newURL;
        try {
          newURL = applyRedirectRule(url, rule, result?.groups || {});
        } catch {
          continue;
        }
        // Never rewrite a link to a non-http(s) scheme (e.g. javascript:),
        // even if a redirect rule's capture group extracted one.
        if (isHttpUrl(newURL) && newURL !== url) {
          if (seen.has(newURL)) return { url: url, steps, limited: true };
          steps.push({ rule: name, original: url, cleaned: newURL });
          url = newURL;
          seen.add(url);
          break;
        }
      }
    }
    if (url === previousURL) return { url: url, steps, limited: false };
  }

  return { url: url, steps, limited: true };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { stripRedirect, inspectRedirect, isHttpUrl };
}

// Explicit shared namespace for extension pages (e.g. the popup) that load
// this file as a classic script alongside ES modules.
globalThis.RFDStripRedirect = { stripRedirect, inspectRedirect, isHttpUrl };
