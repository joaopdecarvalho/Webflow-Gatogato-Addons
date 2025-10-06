// Background service worker for Webflow Designer Extension
// Handles keyboard shortcuts and communication with content scripts

console.log('🎯 Background service worker loaded');

// Listen for keyboard shortcuts
chrome.commands.onCommand.addListener((command) => {
  console.log('⌨️ Keyboard command received:', command);
  
  if (command === 'publish-site') {
    console.log('🚀 Publish shortcut triggered');
    
    // Send message to content script to trigger publish
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        console.log('📍 Active tab:', tabs[0].url);
        
        if (tabs[0].url.includes('webflow.com/design/') || tabs[0].url.includes('.webflow.com')) {
          console.log('✅ On Webflow Designer page, sending message...');
          chrome.tabs.sendMessage(tabs[0].id, { action: 'publish-site' }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('❌ Error sending message:', chrome.runtime.lastError);
            } else {
              console.log('✅ Message sent, response:', response);
            }
          });
        } else {
          console.warn('⚠️ Not on a Webflow Designer page');
        }
      }
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 Message received in background:', request);
  console.log('   - From tab:', sender.tab?.id);
  
  if (request.action === 'publish-started') {
    console.log('📤 Publishing started...');
    sendResponse({ status: 'acknowledged' });
  } else if (request.action === 'publish-complete') {
    console.log('✅ Publishing complete!');
    sendResponse({ status: 'acknowledged' });
  } else if (request.action === 'publish-error') {
    console.error('❌ Publishing error:', request.error);
    sendResponse({ status: 'acknowledged' });
  }
  return true; // Keep message channel open for async response
});

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('🎉 Webflow Designer Extension installed');
  
  // Set default settings
  chrome.storage.sync.get(['soundEnabled'], (result) => {
    if (result.soundEnabled === undefined) {
      chrome.storage.sync.set({ soundEnabled: true });
      console.log('💾 Default settings saved');
    } else {
      console.log('💾 Existing settings:', result);
    }
  });
});