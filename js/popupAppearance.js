(() => {
  const fields = {
    enabled: document.getElementById('modern-enabled'),
    clutterEnabled: document.getElementById('modern-clutter-enabled'),
    hidePromotions: document.getElementById('modern-hide-promotions'),
    hideSidebar: document.getElementById('modern-hide-sidebar'),
    hideFooter: document.getElementById('modern-hide-footer'),
    hideSignatures: document.getElementById('modern-hide-signatures'), compactProfiles: document.getElementById('modern-compact-profiles'),
  };
  if (Object.values(fields).some(field => !field)) return;
  const cleanupFields = ['hidePromotions', 'hideSidebar', 'hideFooter', 'hideSignatures', 'compactProfiles'];
  const settings = globalThis.RFDModern.settings;
  const status = document.getElementById('appearance-status');
  const pageStatus = document.getElementById('appearance-page-status');
  let saved = settings.DEFAULTS, chain = Promise.resolve(), rendering = false;
  function render(value) {
    rendering = true;
    for (const [name, field] of Object.entries(fields)) {
      field.checked = value[name];
      if (cleanupFields.includes(name)) field.disabled = !value.clutterEnabled;
    }
    rendering = false;
  }
  render(saved);
  settings.load().then(value => { saved = value; render(value); }).catch(error => { status.textContent = error.message; });
  settings.subscribe(value => { saved = value; render(value); });
  function save(name, value) {
    chain = chain.catch(() => {}).then(async () => {
      try { await settings.save({ [name]: value }); saved = { ...saved, [name]: value }; status.textContent = ''; }
      catch (error) { status.textContent = error.message; render(saved); }
    });
  }
  for (const [name, field] of Object.entries(fields)) field.addEventListener('change', () => {
    if (rendering) return;
    const value = field.checked;
    if (name === 'clutterEnabled') for (const key of cleanupFields) fields[key].disabled = !value;
    save(name, value);
  });
  document.getElementById('appearance-reset').addEventListener('click', () => {
    chain = chain.catch(() => {}).then(async () => {
      try { await settings.reset(); saved = settings.DEFAULTS; render(saved); status.textContent = 'Appearance reset'; }
      catch (error) { status.textContent = error.message; render(saved); }
    });
  });
  chrome.tabs.query({ active: true, currentWindow: true }).then(async ([tab]) => {
    const state = await chrome.tabs.sendMessage(tab.id, { type: 'getThemeStatus' });
    pageStatus.textContent = state.applied || state.reason === 'disabled' ? '' : 'Modern layout is unavailable on this page.';
  }).catch(() => { pageStatus.textContent = 'Open or reload an RFD forum tab to apply the extension.'; });
})();
