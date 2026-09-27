(() => {
  const api = globalThis.RFDModern ||= {};
  const attributes = ['enabled', 'page', 'hide-promotions', 'hide-sidebar', 'compact-profiles'];
  let status = { enabled: false, applied: false, page: 'unsupported', reason: 'disabled' };
  function getStatus() { return { ...status }; }
  function start(document, window) {
    let active = true, generation = 0, current = null, match = null;
    let appliedHref = null;
    let journal = api.dom.createJournal();
    function clear() { journal.restore(); journal = api.dom.createJournal(); }
    function setAttributes(settings) {
      const html = document.documentElement;
      if (match?.kind === 'thread') journal.setAttribute(html, 'data-rfdm-hide-signatures', String(settings.clutterEnabled && settings.hideSignatures));
      if (!match) return;
      const values = { enabled: 'true', page: match.kind,
        'hide-promotions': String(match.kind !== 'home' && settings.clutterEnabled && settings.hidePromotions), 'hide-sidebar': String(settings.clutterEnabled && settings.hideSidebar), 'compact-profiles': String(settings.clutterEnabled && settings.compactProfiles) };
      for (const name of attributes) if (name !== 'enabled' || settings.enabled) journal.setAttribute(html, 'data-rfdm-' + name, values[name]);
    }
    function apply(settings) {
      if (!active) return;
      if (current?.enabled === settings.enabled && (current.enabled || current.clutterEnabled) && (settings.enabled || settings.clutterEnabled) && match?.root?.isConnected && appliedHref === window.location.href) {
        current = settings;
        setAttributes(settings);
        return;
      }
      clear();
      current = settings;
      match = api.adapters.detect(document, new URL(window.location.href));
      appliedHref = window.location.href;
      if (!match) {
        status = { enabled: settings.enabled, applied: false, page: 'unsupported', reason: settings.enabled ? 'unsupported' : 'disabled' };
        return;
      }
      if (!settings.enabled && !settings.clutterEnabled) {
        status = { enabled: false, applied: false, page: match.kind, reason: 'disabled' };
        return;
      }
      try {
        setAttributes(settings);
        if (match.kind !== 'home') api.adapters.enhanceShell(document, match, journal);
        if (match.kind === 'list' || match.kind === 'classic-list') api.list?.enhance(match.root, settings, journal);
        if (match.kind === 'thread') api.thread?.enhance(match.root, settings, journal);
        status = { enabled: settings.enabled, applied: settings.enabled, page: match.kind, reason: settings.enabled ? null : 'disabled' };
      } catch (error) {
        clear();
        status = { enabled: true, applied: false, page: match.kind, reason: 'adapter-error' };
        console.warn('RFD appearance:', error);
      }
    }
    const added = new Set();
    let removed = false;
    let scheduled = false;
    const observer = new window.MutationObserver(records => {
      if (!active || !current || (!current.enabled && !current.clutterEnabled)) return;
      if (!match) {
        if (!scheduled) { scheduled = true; window.requestAnimationFrame(() => { scheduled = false; if (active && current) apply(current); }); }
        return;
      }
      if (match?.root && !match.root.isConnected) {
        added.clear();
        if (!scheduled) { scheduled = true; window.requestAnimationFrame(() => { scheduled = false; if (active && current) apply(current); }); }
        return;
      }
      if (match.kind === 'home') return;
      for (const record of records) {
        if (record.removedNodes.length) removed = true;
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) added.add(node);
        }
      }
      if ((!added.size && !removed) || scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => {
        scheduled = false;
        if (!active || !current || !match) { added.clear(); removed = false; return; }
        if (!match.root.isConnected) { added.clear(); removed = false; apply(current); return; }
        const roots = [...added]; added.clear();
        const containers = new Set();
        for (const node of roots) {
          if (!node.isConnected) continue;
          try {
            api.adapters.enhanceShell(document, match, journal, node);
            if (!match.root.contains(node)) continue;
            const selector = match.kind === 'thread' ? 'article.thread_post[id]' : match.kind === 'list' ? 'li.topic-card.topic[data-thread-id]' : 'li.row.topic[data-thread-id]';
            containers.add(node.closest?.(selector) || node);
          } catch (error) { console.warn('RFD appearance:', error); }
        }
        for (const node of containers) {
          try {
            if (match.kind === 'list' || match.kind === 'classic-list') api.list?.enhance(node, current, journal);
            if (match.kind === 'thread') api.thread?.enhance(node, current, journal);
          } catch (error) { console.warn('RFD appearance:', error); }
        }
        journal.prune();
        removed = false;
      });
    });
    const stopSettings = api.settings.subscribe(settings => {
      generation++;
      apply(settings);
    });
    const message = (request, sender, respond) => { if (request?.type === 'getThemeStatus') respond(getStatus()); };
    chrome.runtime.onMessage.addListener(message);
    const settingsPromise = api.settings.load().then(settings => ({ settings }), error => ({ error }));
    async function ready() {
      if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
      if (!active) return;
      if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
      const started = generation;
      const result = await settingsPromise;
      if (started !== generation || !active) return;
      if (result.error) { clear(); status = { enabled: false, applied: false, page: 'unsupported', reason: 'settings-error' }; }
      else apply(result.settings);
    }
    ready();
    return () => { active = false; stopSettings(); chrome.runtime.onMessage.removeListener(message); observer.disconnect(); clear(); };
  }
  api.controller = { start, getStatus };
})();
