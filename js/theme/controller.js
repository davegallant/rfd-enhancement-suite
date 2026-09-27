(() => {
  const api = globalThis.RFDModern ||= {};
  const attributes = ['enabled', 'page', 'font-size', 'hide-promotions', 'hide-sidebar', 'compact-profiles'];
  let status = { enabled: false, applied: false, page: 'unsupported', reason: 'disabled' };
  function getStatus() { return { ...status }; }
  function start(document, window) {
    let active = true, generation = 0, current = null, match = null;
    let journal = api.dom.createJournal();
    function clear() { journal.restore(); journal = api.dom.createJournal(); }
    function apply(settings) {
      if (!active) return;
      clear();
      current = settings;
      match = api.adapters.detect(document, new URL(window.location.href));
      if (document.querySelector('#thread .thread_posts article.thread_post')) journal.setAttribute(document.documentElement, 'data-rfdm-hide-signatures', String(settings.hideSignatures));
      if (!settings.enabled || !match) {
        status = { enabled: settings.enabled, applied: false, page: match?.kind || 'unsupported', reason: settings.enabled ? 'unsupported' : 'disabled' };
        return;
      }
      try {
        const html = document.documentElement;
        const values = { enabled: 'true', page: match.kind,
          'font-size': String(settings.fontSize),
          'hide-promotions': String(settings.hidePromotions), 'hide-sidebar': String(settings.hideSidebar), 'compact-profiles': String(settings.compactProfiles) };
        for (const name of attributes) journal.setAttribute(html, 'data-rfdm-' + name, values[name]);
        api.adapters.enhanceShell(document, match, journal);
        if (match.kind === 'list' || match.kind === 'classic-list') api.list?.enhance(match.root, settings, journal);
        if (match.kind === 'thread') api.thread?.enhance(match.root, settings, journal);
        status = { enabled: true, applied: true, page: match.kind, reason: null };
      } catch (error) {
        clear();
        status = { enabled: true, applied: false, page: match.kind, reason: 'adapter-error' };
        console.warn('RFD appearance:', error);
      }
    }
    const added = new Set();
    let scheduled = false;
    const observer = new window.MutationObserver(records => {
      if (!active || !current?.enabled) return;
      if (match?.root && !match.root.isConnected) {
        added.clear();
        if (!scheduled) { scheduled = true; window.requestAnimationFrame(() => { scheduled = false; if (active && current?.enabled) apply(current); }); }
        return;
      }
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1 || node.matches?.('[data-rfdm-owned]') || node.closest?.('[data-rfdm-owned]')) continue;
        added.add(node);
      }
      if (!added.size || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        if (!active || !current?.enabled || !match) { added.clear(); return; }
        if (!match.root.isConnected) { added.clear(); apply(current); return; }
        const roots = [...added]; added.clear();
        for (const node of roots) {
          if (!node.isConnected || !match.root.contains(node)) continue;
          try {
            if (match.kind === 'list' || match.kind === 'classic-list') api.list?.enhance(node, current, journal);
            if (match.kind === 'thread') api.thread?.enhance(node, current, journal);
          } catch (error) { console.warn('RFD appearance:', error); }
        }
        journal.prune();
      });
    });
    const stopSettings = api.settings.subscribe(settings => {
      generation++;
      apply(settings);
    });
    const message = (request, sender, respond) => { if (request?.type === 'getThemeStatus') respond(getStatus()); };
    chrome.runtime.onMessage.addListener(message);
    async function ready() {
      if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
      if (!active) return;
      if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
      const started = generation;
      try { const settings = await api.settings.load(); if (started === generation && active) apply(settings); }
      catch { if (started === generation && active) { clear(); status = { enabled: false, applied: false, page: 'unsupported', reason: 'settings-error' }; } }
    }
    ready();
    return () => { active = false; stopSettings(); chrome.runtime.onMessage.removeListener(message); observer.disconnect(); clear(); };
  }
  api.controller = { start, getStatus };
})();
