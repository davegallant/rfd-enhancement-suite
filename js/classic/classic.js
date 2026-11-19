// Classic layout: restores RFD's previous thread stylesheet and the few text/DOM details CSS cannot reach.
// The bundled stylesheet (css/classic/viewtopic_v2.css) is adapted from RFD Classic Layout 1.2.0 by CalgaryBen.
// Runs at document_start; toggling the setting reloads the page so DOM touch-ups are applied or removed cleanly.
(() => {
  const api = globalThis.RFDModern;
  if (!api?.settings || document.contentType !== 'text/html') return;
  const REDESIGN_CSS = 'viewtopic_v2_replies.css';
  const CLASSIC_HREF = chrome.runtime.getURL('css/classic/viewtopic_v2.css');
  const CLASSIC_EXTRA_CSS = 'html:root:not([data-theme="dark"]){--texts-hover:#0f91ff;--surface-trust-dark:#bae0ff;--border-dark:#757575;--icon-default:#474747;}html[data-theme="dark"]:root{--surface-primary-subtitute:#3d3d3d;--surface-trust-dark:#052540;--surface-pill-red-light:#140806;--texts-emphasis:#ef3434;--surface-primary-dark:#666;}.google-ps-banner{display:none!important}.profile_avatar_initial{display:none!important}.whosonline_v2 .whosonline_avatars{display:none!important}';

  function disableRedesign(node) {
    if (node.nodeType === 1 && node.localName === 'link' && node.href?.includes(REDESIGN_CSS)) node.disabled = true;
  }

  function addClassicStyles() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = 'rfd-classic-stylesheet';
    link.href = CLASSIC_HREF;
    const extra = document.createElement('style');
    extra.id = 'rfd-classic-style';
    extra.textContent = CLASSIC_EXTRA_CSS;
    (document.head || document.documentElement).append(link, extra);
  }

  const icon = (cls) => { const i = document.createElement('i'); i.className = cls; return i; };
  const backToTop = () => location.href.split('#')[0] + '#top';

  function fixup(root = document) {
    // "Quote Reply" -> "Reply with quote"
    root.querySelectorAll('.post_action_quote').forEach((a) => {
      if (a.title === 'Quote Reply') a.title = 'Reply with quote';
      const t = a.querySelector('.post_action_text');
      if (t && t.textContent.trim() === 'Quote Reply') t.textContent = 'Reply with quote';
    });
    // "Joined 2008" -> full join date (kept in the title attribute)
    root.querySelectorAll(".postprofile .profile_datejoined[title^='Joined ']").forEach((dd) => {
      if (dd.dataset.rfdClassic) return;
      dd.dataset.rfdClassic = '1';
      const full = dd.title.slice(7).trim();
      const txt = Array.from(dd.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
      if (txt && full) txt.textContent = ' ' + full + ' ';
    });
    // Reply button: restore "+ Reply to Thread"
    root.querySelectorAll('.reply_to_thread_cta').forEach((a) => {
      if (a.dataset.rfdClassic) return;
      a.dataset.rfdClassic = '1';
      a.replaceChildren(icon('fa fa-plus'), document.createTextNode(' Reply to Thread '));
    });
    // "Quick Reply" heading
    const qr = root.querySelector('#quickreply_container');
    if (qr && !qr.querySelector('.quickreply_title')) {
      const h = document.createElement('h2');
      h.className = 'quickreply_title';
      h.textContent = 'Quick Reply';
      qr.prepend(h);
    }
    // "Topic Information" heading in the who's-online block
    root.querySelectorAll('.whosonline_v2').forEach((w) => {
      if (w.querySelector(':scope > h3')) return;
      const h = document.createElement('h3');
      h.textContent = 'Topic Information';
      w.prepend(h);
    });
    // "Back to top" links
    const ta = root.querySelector('.thread_actions.below_postlist');
    if (ta && !ta.querySelector('.thread_actions_back_to_top')) {
      const a = document.createElement('a');
      a.className = 'thread_actions_back_to_top';
      a.href = backToTop();
      a.append('Back to top ', icon('fa fa-level-up'));
      ta.appendChild(a);
    }
    const ns = root.querySelector('.thread_navigation.below_postlist .thread_navigation_secondary');
    if (ns && !ns.querySelector('.thread_navigation_back_to_top')) {
      const a = document.createElement('a');
      a.className = 'thread_navigation_back_to_top';
      a.href = backToTop();
      a.append(icon('fa fa-arrow-up'), ' Top');
      ns.prepend(a);
    }
  }

  function start() {
    document.querySelectorAll('link[rel~="stylesheet"]').forEach(disableRedesign);
    addClassicStyles();
    let timer = null;
    const runFixups = () => { try { fixup(document); } catch (error) { console.warn('RFD classic layout:', error); } };
    const observer = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) disableRedesign(node);
      clearTimeout(timer);
      timer = setTimeout(runFixups, 100);
    });
    const observe = () => {
      if (!document.body) return;
      runFixups();
      observer.observe(document.documentElement, { childList: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe, { once: true });
    else observe();
  }

  let applied = null;
  api.settings.load().then((settings) => {
    applied = settings.classicLayout === true;
    if (applied) start();
  }).catch(() => {});
  // Stylesheet and DOM changes can't be cleanly undone in place, so reload to apply the new state.
  api.settings.subscribe((settings) => {
    if (applied === null) return;
    if ((settings.classicLayout === true) !== applied) location.reload();
  });
})();
