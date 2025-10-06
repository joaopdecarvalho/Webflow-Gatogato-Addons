// Background service worker for Webflow Designer Extension
// Handles keyboard shortcuts and communication with content scripts

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'publish-site') {
    // Send message to content script to trigger publish
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('webflow.com/design/')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'publish-site' });
      }
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'publish-started') {
    console.log('Publishing started...');
    sendResponse({ status: 'acknowledged' });
  } else if (request.action === 'publish-complete') {
    console.log('Publishing complete!');
    sendResponse({ status: 'acknowledged' });
  } else if (request.action === 'publish-error') {
    console.error('Publishing error:', request.error);
    sendResponse({ status: 'acknowledged' });
  }
  return true; // Keep message channel open for async response
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Webflow Designer Extension installed');
  
  // Set default settings
  chrome.storage.sync.get(['soundEnabled'], (result) => {
    if (result.soundEnabled === undefined) {
      chrome.storage.sync.set({ soundEnabled: true });
    }
  });
});