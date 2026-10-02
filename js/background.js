import { updateRedirects, setDefaultConfig, getRedirects } from "../js/utils.js"

// True when moving to a release with a higher major or minor version, so the
// update page appears for feature releases while patch releases stay quiet.
function isNewerMinorOrMajor(previous, current) {
  const parse = version => String(version).split('.').map(Number);
  const [previousMajor = 0, previousMinor = 0] = parse(previous);
  const [currentMajor = 0, currentMinor = 0] = parse(current);
  return currentMajor > previousMajor ||
    (currentMajor === previousMajor && currentMinor > previousMinor);
}

function setAlarm() {
  chrome.alarms.get('update-redirects', alarm => {
    if (!alarm) {
      chrome.alarms.create('update-redirects', { periodInMinutes: 60 });
    }
  });
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'update-redirects') updateRedirects().catch(console.error);
});

chrome.runtime.onInstalled.addListener((details) => {
  setDefaultConfig(false).then(() => updateRedirects()).catch(console.error);
  setAlarm();
  const version = chrome.runtime.getManifest().version;
  if (details.reason === 'update' && details.previousVersion && isNewerMinorOrMajor(details.previousVersion, version)) {
    chrome.tabs.create({ url: chrome.runtime.getURL('html/whats-new.html') }, () => {
      if (chrome.runtime.lastError) console.warn('Could not open the update page:', chrome.runtime.lastError.message);
    });
  }
});

//Ensure alarm is created
chrome.runtime.onStartup.addListener(() => {
  setAlarm();
});

// Serve redirects from IndexedDB to content scripts via messaging
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'updateRedirects') {
    updateRedirects(message.configUrl).then(redirects => sendResponse({ redirects }))
      .catch(error => sendResponse({ error: error.message }));
    return true;
  }
  if (message.type === "getRedirects") {
    getRedirects().then((redirects) => {
      sendResponse({ redirects });
    }).catch((error) => {
      console.log("Error fetching redirects from IndexedDB:", error);
      sendResponse({ redirects: [] });
    });
    return true; // keep the message channel open for async response
  }
});
