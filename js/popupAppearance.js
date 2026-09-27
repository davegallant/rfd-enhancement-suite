(() => {
  const fields = {
    enabled: document.getElementById('modern-enabled'),
    fontSize: document.getElementById('modern-font-size'), hidePromotions: document.getElementById('modern-hide-promotions'),
    hideSidebar: document.getElementById('modern-hide-sidebar'),
    hideSignatures: document.getElementById('modern-hide-signatures'), compactProfiles: document.getElementById('modern-compact-profiles'),
  };
  if (Object.values(fields).some(field => !field)) return;
  const settings = globalThis.RFDModern.settings;
  const status = document.getElementById('appearance-status');
  const pageStatus = document.getElementById('appearance-page-status');
  const fontSizeValue = document.getElementById('modern-font-size-value');
  let saved = settings.DEFAULTS, chain = Promise.resolve(), rendering = false;
  function render(value) {
    rendering = true;
    for (const [name, field] of Object.entries(fields)) {
      if (field.type === 'checkbox') field.checked = value[name];
      else field.value = String(value[name]);
      if (name === 'fontSize') fontSizeValue.value = `${value[name]} px`;
      if (name !== 'enabled' && name !== 'hideSignatures') field.disabled = !value.enabled;
    }
    rendering = false;
  }
  render(saved);
  fields.fontSize.addEventListener('input', () => { fontSizeValue.value = `${fields.fontSize.value} px`; });
  settings.load().then(value => { saved = value; render(value); }).catch(error => { status.textContent = error.message; });
  settings.subscribe(value => { saved = value; render(value); });
  function save(name, value) {
    chain = chain.catch(() => {}).then(async () => {
      try { await settings.save({ [name]: value }); saved = { ...saved, [name]: value }; status.textContent = 'Appearance saved'; }
      catch (error) { status.textContent = error.message; render(saved); }
    });
  }
  for (const [name, field] of Object.entries(fields)) field.addEventListener('change', () => {
    if (rendering) return;
    const value = field.type === 'checkbox' ? field.checked : name === 'fontSize' ? Number(field.value) : field.value;
    if (name === 'enabled') for (const [key, other] of Object.entries(fields)) if (key !== 'enabled' && key !== 'hideSignatures') other.disabled = !value;
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
    pageStatus.textContent = state.applied || state.reason === 'disabled' ? '' : 'Appearance options are unavailable on this page.';
  }).catch(() => { pageStatus.textContent = 'Open or reload an RFD forum tab to apply the extension.'; });
})();
