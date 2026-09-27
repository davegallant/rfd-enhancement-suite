(() => {
  const root = globalThis.RFDModern ||= {};
  const SELECTORS = Object.freeze({
    list: '#forum-topics.forum-topics', row: 'li.topic-card.topic[data-thread-id]',
    thread: 'article#thread.thread_details', post: 'article.thread_post[id]',
    promotion: '.ad_box, .ad_sponsored_deal', signature: '.signature',
  });
  function detect(document, url) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.hostname !== 'forums.redflagdeals.com') return null;
    if (/^(?:\/(?:search|posting|login|memberlist|ucp|mcp)\.php|\/user\/)/.test(url.pathname) || url.searchParams.get('view') === 'print') return null;
    const thread = document.querySelector(SELECTORS.thread);
    if (thread && thread.querySelector('.thread_posts > ' + SELECTORS.post)) return { kind: 'thread', variant: 'thread-v1', root: thread };
    const list = document.querySelector(SELECTORS.list);
    if (list && document.querySelector('#partition_forums')?.contains(list) && list.querySelector(SELECTORS.row + ' a.topic-card-info.thread_info[href]')) return { kind: 'list', variant: 'card-v1', root: list };
    const classic = document.querySelector('#site_container.hot_deals_page #partition_forums .forums_layout .topiclist.topics');
    if (classic?.querySelector('li.row.topic[data-thread-id] a[href]')) return { kind: 'classic-list', variant: 'classic-sidebar-v1', root: classic };
    return null;
  }
  function enhanceShell(document, match, journal) {
    if (!match || !document.querySelector('#site_content')?.contains(match.root)) return;
    for (const ad of document.querySelectorAll('#site_content .ad_box, #site_content .ad_sponsored_deal, #header_leaderboard, #footer_leaderboard')) {
      if (!ad.contains(match.root) && !ad.closest('li.topic-card.topic, article.thread_post')) journal.setAttribute(ad, 'data-rfdm-role', 'promotion');
    }
  }
  root.adapters = { SELECTORS, detect, enhanceShell };
})();
