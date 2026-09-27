(() => {
  const api = globalThis.RFDModern ||= {};
  function enhance(root, settings, journal) {
    const rows = root.matches?.('li.topic-card.topic[data-thread-id]') ? [root] : [...root.querySelectorAll('li.topic-card.topic[data-thread-id]')];
    const classicRow = root.closest?.('li.row.topic[data-thread-id]');
    const classicRows = classicRow ? [classicRow] : [...root.querySelectorAll('li.row.topic[data-thread-id]')];
    if (root.matches?.('#forum-topics.forum-topics')) journal.setAttribute(root, 'data-rfdm-role', 'list');
    for (const row of rows) {
      const primary = row.querySelector('a.topic-card-info.thread_info[href]');
      if (!primary) continue;
      journal.setAttribute(row, 'data-rfdm-role', 'deal-row');
      if (primary.classList.contains('sponsored-offer') && row.querySelector('.sponsored-badge')) journal.setAttribute(row, 'data-rfdm-sponsored', 'true');
      journal.setAttribute(primary, 'data-rfdm-role', 'deal-title');
      for (const image of row.querySelectorAll('.thread_image')) journal.setAttribute(image, 'data-rfdm-role', 'deal-thumbnail');
    }
    for (const row of classicRows) {
      if (row.querySelector('.thread_info_title > .topictitle > .sponsored')) journal.setAttribute(row, 'data-rfdm-sponsored', 'true');
    }
    const promotions = root.matches?.('li.ad_sponsored_deal') ? [root] : [...root.querySelectorAll('li.ad_sponsored_deal')];
    for (const placement of promotions) if (!placement.closest('li.topic-card.topic')) journal.setAttribute(placement, 'data-rfdm-role', 'promotion');
  }
  api.list = { enhance };
})();
