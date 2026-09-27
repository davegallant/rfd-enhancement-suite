(() => {
  const settingKey = 'linkCleaningEnabled';
  const selector = '.post_content a[href], a.postlink, a.autolinker_link, a.get-deal-button, a[title="RedFlagDeals.com Affiliate Link"]';
  let counted = new WeakSet();
  const lastWritten = new WeakMap();
  const originals = new WeakMap();
  const activity = { count: 0, links: [] };
  let enabled = false;
  let redirects = null;
  let loading = false;
  let observer = null;
  let settingRevision = 0;
  let rulesRevision = 0;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'getActivity') sendResponse({ ...activity, enabled });
    if (message?.type === 'redirectRulesUpdated' && Array.isArray(message.redirects)) {
      rulesRevision++;
      if (JSON.stringify(redirects) === JSON.stringify(message.redirects)) return;
      if (observer) stop();
      redirects = message.redirects;
      if (enabled) start();
    }
  });

  function clean(link) {
    if (!enabled || !redirects || !link.matches(selector)) return;
    const original = link.href;
    if (lastWritten.get(link) === original) return;
    const cleaned = stripRedirect(original, redirects);
    if (cleaned !== original) {
      const textNode = link.childNodes?.length === 1 && link.firstChild?.nodeType === 3 ? link.firstChild : null;
      const originalText = textNode?.nodeValue;
      link.href = cleaned;
      // Read back the browser-normalized href before the observer sees our write.
      const written = link.href;
      const cleanedText = originalText?.trim() === original ? originalText.replace(original, written) : null;
      if (cleanedText !== null) textNode.nodeValue = cleanedText;
      lastWritten.set(link, written);
      originals.set(link, { original, cleaned: written, textNode, originalText, cleanedText });
      if (!counted.has(link)) {
        counted.add(link);
        activity.count++;
      }
      activity.links.push({ original, cleaned });
      if (activity.links.length > 50) activity.links.shift();
    }
  }

  function cleanTree(root) {
    if (root.nodeType !== 1) return;
    clean(root);
    root.querySelectorAll(selector).forEach(clean);
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'attributes') {
          if (record.attributeName === 'class') {
            if (record.target.matches('a')) clean(record.target);
            else if (record.target.matches('.post_content')) cleanTree(record.target);
          }
          else clean(record.target);
        }
        else record.addedNodes.forEach(cleanTree);
      }
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ['href', 'class'],
    });
    document.querySelectorAll(selector).forEach(clean);
  }

  function stop() {
    observer?.disconnect();
    observer = null;
    document.querySelectorAll('a').forEach(link => {
      const previous = originals.get(link);
      if (previous && link.href === previous.cleaned) {
        link.href = previous.original;
        if (previous.cleanedText !== null && previous.textNode?.nodeValue === previous.cleanedText) previous.textNode.nodeValue = previous.originalText;
      }
      originals.delete(link);
      lastWritten.delete(link);
    });
    counted = new WeakSet();
    activity.count = 0;
    activity.links = [];
  }

  function loadRedirects() {
    if (loading) return;
    loading = true;
    const requestedRevision = rulesRevision;
    chrome.runtime.sendMessage({ type: 'getRedirects' }, (response) => {
      loading = false;
      if (requestedRevision !== rulesRevision) return;
      if (chrome.runtime.lastError) {
        console.log('rfd-enhancement-suite:', chrome.runtime.lastError.message);
        return;
      }
      if (!response?.redirects) return;
      redirects = response.redirects;
      if (enabled) start();
    });
  }

  function setEnabled(value) {
    if (enabled === value) return;
    enabled = value;
    if (!enabled) stop();
    else if (redirects) start();
    else loadRedirects();
  }

  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local' || !Object.hasOwn(changes, settingKey)) return;
    settingRevision++;
    setEnabled(changes[settingKey].newValue !== false);
  });
  if (chrome.storage?.local?.get) {
    chrome.storage.local.get(settingKey).then(value => {
      if (!settingRevision) setEnabled(value[settingKey] !== false);
    }).catch(() => {
      if (!settingRevision) setEnabled(true);
    });
  } else {
    setEnabled(true);
  }
})();
