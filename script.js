// ==UserScript==
// @name         RedFlagDeals Affiliate Stripper
// @author       Dave Gallant
// @description  Strip redirect links on forums.redflagdeals.com
// @downloadURL  https://raw.githubusercontent.com/davegallant/rfd-enhancement-suite/main/script.js
// @grant        none
// @match        *://forums.redflagdeals.com/*
// @namespace    http://tampermonkey.net/
// @updateURL    https://raw.githubusercontent.com/davegallant/rfd-enhancement-suite/main/script.js
// @version      2026-10-02
// ==/UserScript==

(function() {
    'use strict';

    var Links = document.querySelectorAll('a.postlink, a.autolinker_link');

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

function stripRedirect(URL, redirectRegex) {
  if (!isHttpUrl(URL)) return URL;
  return inspectRedirect(URL, redirectRegex).url;
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

function inspectRedirect(URL, redirectRegex) {
  if (!isHttpUrl(URL)) throw new Error('Enter a valid HTTP or HTTPS URL');
  const steps = [];
  const seen = new Set([URL]);
  const rules = compileRules(redirectRegex);
  for (let step = 0; step < 20; step++) {
    const previousURL = URL;
    const parsed = new globalThis.URL(URL);
    for (const { regex, hostRegex, pathRegex, name, rule } of rules) {
      const hostMatch = rule.host === parsed.hostname || rule.hosts?.includes(parsed.hostname) ||
        rule.hostSuffixes?.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host)) || hostRegex?.test(parsed.hostname);
      const structured = hostMatch && (!pathRegex || pathRegex.test(parsed.pathname));
      const result = regex?.exec(URL);
      if (structured || result?.groups?.baseUrl) {
        let newURL;
        try {
          newURL = applyRedirectRule(URL, rule, result?.groups || {});
        } catch {
          continue;
        }
        // Never rewrite a link to a non-http(s) scheme (e.g. javascript:),
        // even if a redirect rule's capture group extracted one.
        if (isHttpUrl(newURL) && newURL !== URL) {
          if (seen.has(newURL)) return { url: URL, steps, limited: true };
          steps.push({ rule: name, original: URL, cleaned: newURL });
          URL = newURL;
          seen.add(URL);
          break;
        }
      }
    }
    if (URL === previousURL) return { url: URL, steps, limited: false };
  }

  return { url: URL, steps, limited: true };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { stripRedirect, inspectRedirect, isHttpUrl };
}


    Links.forEach(function(Link) {
        var ReferralURL = Link.href;
        Link.href = stripRedirect(ReferralURL, REDIRECT_REGEX);
    });

})();
