// ==UserScript==
// @name         RedFlagDeals Affiliate Stripper
// @author       Dave Gallant
// @description  Strip redirect links on forums.redflagdeals.com
// @downloadURL  https://raw.githubusercontent.com/davegallant/rfd-affiliate-stripper/main/script.js
// @grant        none
// @match        *://forums.redflagdeals.com/*
// @namespace    http://tampermonkey.net/
// @updateURL    https://raw.githubusercontent.com/davegallant/rfd-affiliate-stripper/main/script.js
// @version      2026-09-27
// ==/UserScript==

(function() {
    'use strict';

    var Links = document.querySelectorAll('a.postlink, a.autolinker_link');

    const REDIRECT_REGEX = [
  {
    "name": "Amazon redirect",
    "pattern": "^https?://(?:[a-zA-Z0-9-]+\\.)*amazon\\.(?:ca|com)/gp/redirect\\.html\\?(?:[^#]*&)?location=(?<baseUrl>[^&#]+)",
    "destinationParam": "location"
  },
  {
    "name": "Amazon tag",
    "pattern": "^(?<baseUrl>https?://(?:[a-zA-Z0-9-]+\\.)*amazon\\.(?:ca|com)/[^#]*?)[?&]tag=[^&#]*(?:&(?<rest>[^#]+))?(?:#.*)?$",
    "removeParams": ["tag"]
  },
  {
    "name": "Amazon ref query param",
    "pattern": "^(?<baseUrl>https?://(?:[a-zA-Z0-9-]+\\.)*amazon\\.(?:ca|com)/[^#]*?)[?&]ref=[^&#]*(?:&(?<rest>[^#]+))?(?:#.*)?$",
    "removeParams": ["ref"]
  },
  {
    "name": "Amazon ref path segment",
    "pattern": "^(?<baseUrl>https?://(?:[a-zA-Z0-9-]+\\.)*amazon\\.(?:ca|com)/[^?#]*?)/ref=[^?#]*(?:\\?(?<rest>[^#]+))?(?:#.*)?$",
    "removePathRef": true
  },
  {
    "name": "Amazon search tracking params",
    "pattern": "^(?<baseUrl>https?://(?:[a-zA-Z0-9-]+\\.)*amazon\\.(?:ca|com)/(?:[^?#]*/)?(?:dp|gp/product)/[A-Z0-9]+[^?#]*?(?:\\?[^#]*?)?)[?&](?:crid|dib|dib_tag|keywords|keywor|qid|sprefix)(?:=[^&#]*)?(?:&(?<rest>[^#]+))?(?:#.*)?$",
    "removeParams": ["crid", "dib", "dib_tag", "keywords", "keywor", "qid", "sprefix"]
  },
  {
    "name": "Amazon ref_ query param",
    "pattern": "^(?<baseUrl>https?://(?:[a-zA-Z0-9-]+\\.)*amazon\\.(?:ca|com)/[^#]*?)[?&]ref_=[^&#]*(?:&(?<rest>[^#]+))?(?:#.*)?$",
    "removeParams": ["ref_"]
  },
  {
    "name": "Amazon social_share query param",
    "pattern": "^(?<baseUrl>https?://(?:[a-zA-Z0-9-]+\\.)*amazon\\.(?:ca|com)/[^#]*?)[?&]social_share=[^&#]*(?:&(?<rest>[^#]+))?(?:#.*)?$",
    "removeParams": ["social_share"]
  },
  {
    "name": "Best Buy",
    "pattern": "bestbuyca.(.*).net(.*)\\?u=(?<baseUrl>.*)"
  },
  {
    "name": "HP",
    "pattern": "www.awin1.com(.*)&clickref=&p=(?<baseUrl>.*)"
  },
  {
    "name": "Samsung",
    "pattern": "www.awin1.com(.*)?p=(?<baseUrl>.*)"
  },
  {
    "name": "redirectingat.com",
    "pattern": "go.redirectingat.com/.*url=(?<baseUrl>.*).*"
  },
  {
    "name": "homedepot",
    "pattern": "the-home-depot-ca.pxf.io(.*)?u=(?<baseUrl>.*)"
  },
  {
    "name": "redirectingat",
    "pattern": "go.redirectingat.com(.*)?url=(?<baseUrl>.*)"
  },
  {
    "name": "sjv.io",
    "pattern": ".*sjv\\.io.*[?&]u=(?<baseUrl>.*?)(?:&subId1=.*)?$"
  },
  {
    "name": "ldw66v.net",
    "pattern": ".*ldw66v\\.net.*[?&]u=(?<baseUrl>.*)"
  },
  {
    "name": "canadiantire",
    "pattern": "imp.i([0-9]*).net(.*)?u=(?<baseUrl>.*)"
  },
  {
    "name": "underarmour",
    "pattern": "www.awin1.com(.*)?ued=(?<baseUrl>.*)"
  },
  {
    "name": "lenovo",
    "pattern": "(.*).evyy.net(.*)?u=(?<baseUrl>.*)"
  },
  {
    "name": "kqzyfj",
    "pattern": "www.kqzyfj.com(.*)?url=(?<baseUrl>.*)&sid=.*"
  },
  {
    "name": "walmart",
    "pattern": "click.linksynergy.com(.*)?murl=(?<baseUrl>.*)&u1=.*"
  },
  {
    "name": "dpbolvw.net",
    "pattern": "www.dpbolvw.net(.*)?url=(?<baseUrl>.*)"
  },
  {
    "name": "jdoqocy.com",
    "pattern": "www.jdoqocy.com(.*)?url=(?<baseUrl>.*)&sid=rfdcb"
  },
  {
    "name": "pfx.io",
    "pattern": "(.*).pxf.io(.*)?u=(?<baseUrl>.*)"
  },
  {
    "name": "avantlink.com",
    "pattern": "(.*).avantlink.com(.*)?url=(?<baseUrl>.*)"
  },
  {
    "name": "anrdoezrs.net",
    "pattern": ".*anrdoezrs\\.net.+\\?url=(?<baseUrl>.*)&sid=.*"
  },
  {
    "name": "tkqlhce.com",
    "pattern": ".*tkqlhce\\.com.+?url=(?<baseUrl>.*)&sid=.*"
  },
  {
    "name": "staples",
    "pattern": ".*staplescanada\\.4u8mqw\\.net.+\\?u=(?<baseUrl>.*)"
  },
  {
    "name": "pjtra.com",
    "pattern": ".*pjtra\\.com.*\\?url=(?<baseUrl>.*)&sid.*"
  },
  {
    "name": "pjatr.com",
    "pattern": ".*pjatr\\.com.*\\?url=(?<baseUrl>.*)&sid.*"
  },
  {
    "name": "pntra.com",
    "pattern": ".*pntra\\.com.*\\?url=(?<baseUrl>.*)&sid.*"
  },
  {
    "name": "pntrs.com",
    "pattern": ".*pntrs\\.com.*\\?url=(?<baseUrl>.*)&sid.*"
  },
  {
    "name": "pntrac.com",
    "pattern": ".*pntrac\\.com.*\\?url=(?<baseUrl>.*)&sid.*"
  },
  {
    "name": "shareasale.com",
    "pattern": ".*shareasale\\.com.*&urllink=(?<baseUrl>.*)"
  },
  {
    "name": "mkr3.net",
    "pattern": ".*mkr3\\.net.*\\?u=(?<baseUrl>.*)"
  },
  {
    "name": "njih.net",
    "pattern": "(.*).njih.net(.*)?u=(?<baseUrl>.*)"
  },
  {
    "name": "fintelconnect.com",
    "pattern": ".*fintelconnect\\.com.*\\?u=(?<baseUrl>.*)"
  },
  {
    "name": "c2ukkg.net",
    "pattern": ".*c2ukkg\\.net.*\\?u=(?<baseUrl>.*)"
  },
  {
    "name": "dodxnr.net",
    "pattern": ".*dodxnr\\.net.*\\?u=(?<baseUrl>.*)"
  },
  {
    "name": "doubleclick",
    "pattern": "adclick\\.g\\.doubleclick\\.net(.*)?adurl=(?<baseUrl>.*)"
  },
  {
    "name": "RFD subId1 tracking param",
    "pattern": "(?<baseUrl>https?://\\S+?)[&?]subId1=[^&]*(?:&(?<rest>\\S+))?$"
  }
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
      if (typeof rule?.pattern === 'string') rules.push({
        regex: new RegExp(rule.pattern), name: rule.name || 'Unnamed rule', rule,
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
    for (const { regex, name, rule } of rules) {
      const result = regex.exec(URL);
      if (result?.groups?.baseUrl) {
        let newURL;
        try {
          newURL = applyRedirectRule(URL, rule, result.groups);
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
