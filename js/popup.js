import { updateRedirects, dbGet, getRedirects, DEFAULT_CONFIG_URL } from "../js/utils.js"

const inputField = document.getElementById("input-field");
const saveButton = document.getElementById("save-button");
const resetButton = document.getElementById("reset-button");
const statusMessage = document.getElementById("status-message");

async function showUpdateStatus() {
  try {
    const status = await dbGet('updateStatus');
    document.getElementById('last-update').textContent = status?.lastSuccess
      ? `Last rules update: ${new Date(status.lastSuccess).toLocaleString()}`
      : 'No successful rules update yet; bundled rules are available offline.';
    document.getElementById('update-error').textContent = status?.error
      ? `Last update failed: ${status.error}` : '';
  } catch (error) {
    document.getElementById('update-error').textContent = `Could not read update status: ${error.message}`;
  }
}

async function showActivity() {
  const count = document.getElementById('activity-count');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const activity = await chrome.tabs.sendMessage(tab.id, { type: 'getActivity' });
    const list = document.getElementById('activity-links');
    list.replaceChildren();
    if (activity.enabled === false || !document.getElementById('link-cleaning-enabled').checked) {
      count.textContent = 'Link cleaning is off on this page';
      return;
    }
    count.textContent = `${activity.count} ${activity.count === 1 ? 'link' : 'links'} cleaned on this page`;
    for (const { original, cleaned } of activity.links) {
      const item = document.createElement('li');
      item.textContent = `${original}\n→ ${cleaned}`;
      list.append(item);
    }
  } catch {
    count.textContent = 'Open an RFD forum page to see cleaned links. Reload pages opened before installation.';
  }
}

showActivity();
showUpdateStatus();

const cleaningKey = 'linkCleaningEnabled';
const cleaningToggle = document.getElementById('link-cleaning-enabled');
const cleaningStatus = document.getElementById('link-cleaning-status');
let savedCleaningEnabled = true;
let cleaningChanged = false;
cleaningToggle.checked = true;
if (chrome.storage?.local?.get) {
  cleaningToggle.disabled = true;
  chrome.storage.local.get(cleaningKey).then(value => {
    if (cleaningChanged) return;
    savedCleaningEnabled = value[cleaningKey] !== false;
    cleaningToggle.checked = savedCleaningEnabled;
    showActivity();
  }).catch(error => { cleaningStatus.textContent = `Could not read link setting: ${error.message}`; })
    .finally(() => { cleaningToggle.disabled = false; });
}
cleaningToggle.addEventListener('change', async () => {
  cleaningChanged = true;
  const wanted = cleaningToggle.checked;
  cleaningToggle.disabled = true;
  try {
    await chrome.storage.local.set({ [cleaningKey]: wanted });
    savedCleaningEnabled = wanted;
    cleaningStatus.textContent = wanted ? 'Link cleaning is on.' : 'Link cleaning is off.';
    if (wanted) showActivity();
    else {
      document.getElementById('activity-count').textContent = 'Link cleaning is off on this page';
      document.getElementById('activity-links').replaceChildren();
    }
  } catch (error) {
    cleaningToggle.checked = savedCleaningEnabled;
    cleaningStatus.textContent = `Could not save link setting: ${error.message}`;
  } finally {
    cleaningToggle.disabled = false;
  }
});

const testUrl = document.getElementById('test-url');
document.getElementById('test-form').addEventListener('submit', async event => {
  event.preventDefault();
  const result = document.getElementById('test-result');
  const steps = document.getElementById('test-steps');
  const button = document.getElementById('test-button');
  steps.replaceChildren();
  button.disabled = true;
  result.textContent = 'Testing…';
  try {
    const inspection = inspectRedirect(testUrl.value.trim(), await getRedirects());
    result.textContent = inspection.url;
    for (const step of inspection.steps) {
      const item = document.createElement('li');
      item.textContent = `${step.rule}: ${step.original}\n→ ${step.cleaned}`;
      steps.append(item);
    }
    if (!inspection.steps.length || inspection.limited) {
      const item = document.createElement('li');
      item.textContent = inspection.limited
        ? 'Stopped at a cycle or the redirect limit; this result may be partially cleaned.'
        : 'No matching changes; this URL is unchanged.';
      steps.append(item);
    }
  } catch (error) {
    result.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

let statusTimeout;

function showStatus(message, type) {
  clearTimeout(statusTimeout);
  statusMessage.textContent = message;
  statusMessage.className = type;

  statusTimeout = setTimeout(() => {
    statusMessage.classList.add("fade-out");
    setTimeout(() => {
      statusMessage.textContent = "";
      statusMessage.className = "";
    }, 500);
  }, 4000);
}

function setButtonsDisabled(disabled) {
  saveButton.disabled = disabled;
  resetButton.disabled = disabled;
}

dbGet("config").then((value) => {
  if (value) {
    inputField.value = value;
  }
}).catch(error => showStatus(error.message, 'error'));

saveButton.addEventListener("click", async () => {
  const value = inputField.value.trim();

  if (!value) {
    showStatus("URL cannot be empty", "error");
    return;
  }

  setButtonsDisabled(true);
  showStatus("Validating…", "success");

  try {
    await updateRedirects(value);
    showStatus("Saved successfully", "success");
  } catch (e) {
    showStatus(e.message, "error");
  } finally {
    setButtonsDisabled(false);
    await showUpdateStatus();
  }
});

resetButton.addEventListener("click", async () => {
  setButtonsDisabled(true);
  showStatus("Resetting…", "success");

  try {
    await updateRedirects(DEFAULT_CONFIG_URL);
    inputField.value = DEFAULT_CONFIG_URL;
    showStatus("Reset to default", "success");
  } catch (e) {
    showStatus("Reset failed: " + e.message, "error");
  } finally {
    setButtonsDisabled(false);
    await showUpdateStatus();
  }
});
