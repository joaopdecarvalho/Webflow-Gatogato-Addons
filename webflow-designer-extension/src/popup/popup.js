// Popup script for Webflow Designer Extension

document.addEventListener('DOMContentLoaded', function() {
  // Get DOM elements
  const publishButton = document.getElementById('publish-button');
  const statusMessage = document.getElementById('status-message');
  const soundToggle = document.getElementById('sound-toggle');
  const targetAttributeInput = document.getElementById('target-attribute');
  const toggleAttributeInput = document.getElementById('toggle-attribute');
  const saveSettingsBtn = document.getElementById('save-settings');
  const refreshButtonsBtn = document.getElementById('refresh-buttons');

  // Load saved settings
  loadSettings();

  // Publish button click handler
  publishButton.addEventListener('click', function() {
    publishButton.disabled = true;
    publishButton.textContent = 'Publishing...';
    statusMessage.textContent = 'Publishing in progress...';
    statusMessage.className = 'status info';

    // Send message to content script to publish
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('webflow.com/design/')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'publish-site' }, (response) => {
          if (chrome.runtime.lastError) {
            statusMessage.textContent = 'Error: Make sure you are on a Webflow Designer page';
            statusMessage.className = 'status error';
          } else {
            statusMessage.textContent = 'Publish initiated! Watch the Webflow Designer for progress.';
            statusMessage.className = 'status success';
          }
          
          publishButton.disabled = false;
          publishButton.innerHTML = '<span class="icon">🚀</span> Publish Website';
        });
      } else {
        statusMessage.textContent = 'Please navigate to a Webflow Designer page';
        statusMessage.className = 'status error';
        publishButton.disabled = false;
        publishButton.innerHTML = '<span class="icon">🚀</span> Publish Website';
      }
    });
  });

  // Save settings button handler
  saveSettingsBtn.addEventListener('click', function() {
    const settings = {
      soundEnabled: soundToggle.checked,
      targetAttribute: targetAttributeInput.value || 'data-show-in-designer',
      toggleAttribute: toggleAttributeInput.value || 'data-show-in-designer'
    };

    chrome.storage.sync.set(settings, function() {
      statusMessage.textContent = 'Settings saved! Reload the Webflow page to apply changes.';
      statusMessage.className = 'status success';
      
      setTimeout(() => {
        statusMessage.textContent = '';
      }, 3000);
    });
  });

  // Refresh buttons handler
  refreshButtonsBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url.includes('webflow.com/design/')) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'refresh-buttons' }, (response) => {
          if (response) {
            statusMessage.textContent = 'Toggle buttons refreshed!';
            statusMessage.className = 'status success';
            
            setTimeout(() => {
              statusMessage.textContent = '';
            }, 2000);
          }
        });
      } else {
        statusMessage.textContent = 'Please navigate to a Webflow Designer page';
        statusMessage.className = 'status error';
      }
    });
  });

  // Sound toggle handler
  soundToggle.addEventListener('change', function() {
    chrome.storage.sync.set({ soundEnabled: soundToggle.checked });
  });

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get([
      'soundEnabled', 
      'targetAttribute', 
      'toggleAttribute'
    ], function(result) {
      soundToggle.checked = result.soundEnabled !== false; // Default to true
      targetAttributeInput.value = result.targetAttribute || 'data-show-in-designer';
      toggleAttributeInput.value = result.toggleAttribute || 'data-show-in-designer';
    });
  }
});