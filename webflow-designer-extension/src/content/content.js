// Content script for Webflow Designer Extension
// Runs in the context of the Webflow Designer page

console.log('Webflow Designer Extension: Content script loaded');

// Configuration
const CONFIG = {
  targetAttribute: 'data-show-in-designer', // The attribute to look for
  toggleAttribute: 'data-show-in-designer',   // The attribute to toggle (same as target)
  iconHTML: '👁️', // Icon to display (eye icon for visibility)
  checkInterval: 2000, // How often to check for new elements (ms)
  soundEnabled: true
};

// Initialize the extension
function init() {
  // Load settings from storage
  chrome.storage.sync.get(['soundEnabled', 'targetAttribute', 'toggleAttribute'], (result) => {
    if (result.soundEnabled !== undefined) CONFIG.soundEnabled = result.soundEnabled;
    if (result.targetAttribute) CONFIG.targetAttribute = result.targetAttribute;
    if (result.toggleAttribute) CONFIG.toggleAttribute = result.toggleAttribute;
    
    // Start observing for elements
    observeForElements();
    
    // Initial scan
    addToggleButtonsToElements();
  });
}

// Add toggle buttons to elements that have the target attribute
function addToggleButtonsToElements() {
  // Find all elements with the target attribute
  const selector = `[${CONFIG.targetAttribute}]`;
  const elements = document.querySelectorAll(selector);
  
  elements.forEach(element => {
    // Skip if button already added
    if (element.querySelector('.wf-ext-toggle-btn')) return;
    
    // Create toggle button
    const toggleBtn = createToggleButton(element);
    
    // Position it absolutely within the element
    element.style.position = element.style.position || 'relative';
    element.appendChild(toggleBtn);
  });
}

// Create a toggle button for an element
function createToggleButton(targetElement) {
  const button = document.createElement('button');
  button.className = 'wf-ext-toggle-btn';
  button.innerHTML = CONFIG.iconHTML;
  button.title = 'Toggle custom attribute';
  
  // Styling
  Object.assign(button.style, {
    position: 'absolute',
    top: '5px',
    right: '5px',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '2px solid #146EF5',
    background: 'white',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: '10000',
    transition: 'all 0.2s ease'
  });
  
  // Update button appearance based on current state
  updateButtonState(button, targetElement);
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Toggle the attribute between 'true' and 'false'
    window.WebflowAPI.toggleCustomAttribute(
      targetElement,
      CONFIG.toggleAttribute,
      'true',
      'false'
    );
    
    // Update button appearance
    updateButtonState(button, targetElement);
  });
  
  // Hover effects
  button.addEventListener('mouseenter', () => {
    button.style.transform = 'scale(1.1)';
    button.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
    button.style.boxShadow = 'none';
  });
  
  return button;
}

// Update button appearance based on toggle state
function updateButtonState(button, element) {
  const currentState = element.getAttribute(CONFIG.toggleAttribute);
  
  if (currentState === 'true') {
    button.style.background = '#146EF5';
    button.style.color = 'white';
    button.title = 'Hide in designer (click to toggle)';
  } else {
    button.style.background = 'white';
    button.style.color = '#146EF5';
    button.title = 'Show in designer (click to toggle)';
  }
}

// Observe DOM for new elements
function observeForElements() {
  // Use MutationObserver to detect new elements
  const observer = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        shouldCheck = true;
      }
    });
    
    if (shouldCheck) {
      addToggleButtonsToElements();
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also periodically check for new elements
  setInterval(addToggleButtonsToElements, CONFIG.checkInterval);
}

// Handle publish site command
async function handlePublishSite() {
  try {
    console.log('Publishing site...');
    
    // Notify background script
    chrome.runtime.sendMessage({ action: 'publish-started' });
    
    // Trigger publish via Webflow API utility
    const result = await window.WebflowAPI.publishSite();
    
    console.log('Publish result:', result);
    
    // Play completion sound
    if (CONFIG.soundEnabled) {
      playCompletionSound();
    }
    
    // Notify background script
    chrome.runtime.sendMessage({ action: 'publish-complete' });
    
  } catch (error) {
    console.error('Publish error:', error);
    chrome.runtime.sendMessage({ 
      action: 'publish-error', 
      error: error.message 
    });
  }
}

// Play completion sound
function playCompletionSound() {
  try {
    const audio = new Audio(chrome.runtime.getURL('assets/sounds/complete.mp3'));
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.error('Error playing sound:', err);
    });
  } catch (error) {
    console.error('Error creating audio:', error);
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'publish-site') {
    handlePublishSite();
    sendResponse({ status: 'publishing' });
  } else if (request.action === 'play-completion-sound') {
    playCompletionSound();
    sendResponse({ status: 'sound-played' });
  } else if (request.action === 'refresh-buttons') {
    addToggleButtonsToElements();
    sendResponse({ status: 'refreshed' });
  }
  
  return true; // Keep message channel open
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}