(() => {
  const api = globalThis.RFDModern ||= {};
  function createJournal() {
    const originals = new Map();
    const owned = new Set();
    function setAttribute(element, name, value) {
      if (!originals.has(element)) originals.set(element, new Map());
      const attrs = originals.get(element);
      if (!attrs.has(name)) attrs.set(name, { original: element.getAttribute(name), last: null });
      element.setAttribute(name, value);
      attrs.get(name).last = value;
    }
    function appendOwned(parent, node) { node.setAttribute('data-rfdm-owned', 'true'); parent.append(node); owned.add(node); }
    function prune() {
      for (const element of originals.keys()) if (!element.isConnected) originals.delete(element);
      for (const element of owned) if (!element.isConnected) owned.delete(element);
    }
    function restore() {
      for (const [element, attrs] of originals) for (const [name, { original, last }] of attrs) {
        if (element.getAttribute(name) !== last) continue;
        if (original === null) element.removeAttribute(name); else element.setAttribute(name, original);
      }
      for (const element of owned) element.remove();
      originals.clear(); owned.clear();
    }
    return { setAttribute, appendOwned, prune, restore };
  }
  api.dom = { createJournal };
})();
