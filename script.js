// ==UserScript==
// @name         RFD Enhancement Suite
// @author       Dave Gallant
// @description  Strip redirect links on forums.redflagdeals.com
// @downloadURL  https://raw.githubusercontent.com/davegallant/rfd-enhancement-suite/main/script.js
// @grant        none
// @match        *://forums.redflagdeals.com/*
// @namespace    http://tampermonkey.net/
// @updateURL    https://raw.githubusercontent.com/davegallant/rfd-enhancement-suite/main/script.js
// @version      1.5.0
// ==/UserScript==

(function() {
    'use strict';

    // Same link selector as the browser extension (js/content.js).
    const SELECTOR = '.post_content a[href], a.postlink, a.autolinker_link, a.get-deal-button, a[title="RedFlagDeals.com Affiliate Link"]';

    const REDIRECT_REGEX = [
  { "name": "Amazon redirect", "hostSuffixes": ["amazon.ca", "amazon.com"], "pathPattern": "^/gp/redirect\\.html$", "destinationParam": "location" },
  { "name": "Amazon tracking", "hostSuffixes": ["amazon.ca", "amazon.com"], "removeParams": ["tag", "ref", "ref_", "social_share"], "removePathRef": true },
  { "name": "Amazon product tracking", "hostSuffixes": ["amazon.ca", "amazon.com"], "pathPattern": "/(?:dp|gp/product)/[A-Z0-9]+(?:/|$)", "removeParams": ["crid", "dib", "dib_tag", "keywords", "keywor", "qid", "sprefix"] },
  { "name": "URL affiliate redirect", "hosts": ["go.redirectingat.com", "www.kqzyfj.com", "www.dpbolvw.net", "www.jdoqocy.com", "www.anrdoezrs.net", "www.tkqlhce.com", "www.pjtra.com", "www.pjatr.com", "www.pntra.com", "www.pntrs.com", "www.pntrac.com"], "hostSuffixes": ["avantlink.com"], "destinationParam": "url" },
  { "name": "U affiliate redirect", "hosts": ["the-home-depot-ca.pxf.io", "staplescanada.4u8mqw.net", "www.mkr3.net", "www.fintelconnect.com", "www.c2ukkg.net", "www.dodxnr.net"], "hostSuffixes": ["sjv.io", "ldw66v.net", "evyy.net", "pxf.io", "njih.net"], "destinationParam": "u" },
  { "name": "Awin product redirect", "host": "www.awin1.com", "destinationParam": "p" },
  { "name": "Awin encoded redirect", "host": "www.awin1.com", "destinationParam": "ued" },
  { "name": "Linksynergy redirect", "host": "click.linksynergy.com", "destinationParam": "murl" },
  { "name": "ShareASale redirect", "host": "www.shareasale.com", "destinationParam": "urllink" },
  { "name": "DoubleClick redirect", "host": "adclick.g.doubleclick.net", "destinationParam": "adurl" },
  { "name": "Best Buy redirect", "hostPattern": "^bestbuyca\\.[a-zA-Z0-9-]+\\.net$", "destinationParam": "u" },
  { "name": "Canadian Tire redirect", "hostPattern": "^imp\\.i[0-9]+\\.net$", "destinationParam": "u" },
  { "name": "RFD subId1 tracking param", "pattern": "(?<baseUrl>https?://\\S+?)[&?]subId1=[^&]*(?:&(?<rest>\\S+))?$" }
]
;

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


    function clean(link) {
        if (!link.matches(SELECTOR)) return;
        const cleaned = stripRedirect(link.href, REDIRECT_REGEX);
        if (cleaned !== link.href) link.href = cleaned;
    }

    function cleanTree(root) {
        if (root.nodeType !== 1) return;
        clean(root);
        root.querySelectorAll(SELECTOR).forEach(clean);
    }

    cleanTree(document.documentElement);
    // Watch for links added after load (infinite scroll, posts loaded later).
    new MutationObserver(records => {
        for (const record of records) record.addedNodes.forEach(cleanTree);
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
