(() => {
  const api = globalThis.RFDModern ||= {};
  const SCORE_SELECTOR = '.votes, .post_voting .total_count, .thread-meta-small .total_count';
  function colourScores(row, journal) {
    for (const score of row.querySelectorAll(SCORE_SELECTOR)) {
      const label = score.cloneNode(true);
      label.querySelectorAll('svg').forEach(icon => icon.remove());
      const text = label.textContent.trim().replace(/\u2212/g, '-').replace(/,/g, '').replace(/\s+(votes?|score)$/i, '');
      const value = /^[+-]?\d+$/.test(text) ? Number(text) : NaN;
      const state = !Number.isFinite(value) ? '' : value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero';
      if (state || score.hasAttribute('data-rfdm-score')) journal.setAttribute(score, 'data-rfdm-score', state);
    }
  }
  function enhance(root, journal) {
    const rows = root.matches?.('li.topic-card.topic[data-thread-id]') ? [root] : [...root.querySelectorAll('li.topic-card.topic[data-thread-id]')];
    const classicRow = root.closest?.('li.row.topic[data-thread-id]');
    const classicRows = classicRow ? [classicRow] : [...root.querySelectorAll('li.row.topic[data-thread-id]')];
    if (root.matches?.('#forum-topics.forum-topics')) journal.setAttribute(root, 'data-rfdm-role', 'list');
    for (const row of rows) {
      const primary = row.querySelector('a.topic-card-info.thread_info[href]');
      if (!primary) continue;
      journal.setAttribute(row, 'data-rfdm-role', 'deal-row');
      colourScores(row, journal);
      if (primary.classList.contains('sponsored-offer') && row.querySelector('.sponsored-badge')) journal.setAttribute(row, 'data-rfdm-sponsored', 'true');
    }
    for (const row of classicRows) {
      colourScores(row, journal);
      if (row.querySelector('.thread_info_title > .topictitle > .sponsored')) journal.setAttribute(row, 'data-rfdm-sponsored', 'true');
    }
    const promotions = root.matches?.('li.ad_sponsored_deal') ? [root] : [...root.querySelectorAll('li.ad_sponsored_deal')];
    for (const placement of promotions) if (!placement.closest('li.topic-card.topic')) journal.setAttribute(placement, 'data-rfdm-role', 'promotion');
  }
  api.list = { enhance, SCORE_SELECTOR };
})();
