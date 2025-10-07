// Webflow Designer Extension - Content Script
// Adds toggle buttons to Navigator panel for elements with custom attributes
// 
// Debug Mode: Set CONFIG.debugMode = true to enable verbose console logging
// By default, only essential messages are logged to reduce console noise

console.log('🚀 Webflow Designer Extension loaded');

// Configuration
const CONFIG = {
  targetAttribute: 'data-show-in-designer',
  toggleAttribute: 'data-show-in-designer',
  iconHTML: '👁️',
  checkInterval: 2000,
  soundEnabled: true,
  searchTimeLimit: 10000, // Stop searching after 10 seconds
  debugMode: false // Set to true for verbose logging
};

// Track initialization time
let initTime = Date.now();
let searchTimedOut = false;
let processedElements = new Set();
let mutationDebounceTimer = null;

// Helper function for debug logging
function debugLog(...args) {
  if (CONFIG.debugMode) {
    console.log(...args);
  }
}

// Initialize the extension
async function init() {
  debugLog('� Webflow Designer Extension initialized');
  
  // Load settings from storage
  const result = await chrome.storage.sync.get(['soundEnabled', 'targetAttribute', 'toggleAttribute', 'debugMode']);
  if (result.soundEnabled !== undefined) CONFIG.soundEnabled = result.soundEnabled;
  if (result.targetAttribute) CONFIG.targetAttribute = result.targetAttribute;
  if (result.toggleAttribute) CONFIG.toggleAttribute = result.toggleAttribute;
  if (result.debugMode !== undefined) CONFIG.debugMode = result.debugMode;
  
  debugLog('💾 Loaded settings:', result);
  debugLog('⚙️ CONFIG:', CONFIG);
  
  // Start observing for Navigator panel and elements
  startObserving();
  
  // Initial scan after 2 seconds
  setTimeout(() => {
    debugLog('🔍 Running initial scan...');
    addToggleButtonsToNavigator();
  }, 2000);
  
  // Periodic checks for first 10 seconds
  const checkInterval = setInterval(() => {
    if (Date.now() - initTime > CONFIG.searchTimeLimit) {
      clearInterval(checkInterval);
      debugLog('⏱️ Search period ended');
      searchTimedOut = true;
    } else {
      addToggleButtonsToNavigator();
    }
  }, CONFIG.checkInterval);
  
  // Additional aggressive scans in the first few seconds
  setTimeout(() => addToggleButtonsToNavigator(), 1000);
  setTimeout(() => addToggleButtonsToNavigator(), 3000);
  setTimeout(() => addToggleButtonsToNavigator(), 5000);
  setTimeout(() => addToggleButtonsToNavigator(), 7000);
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    debugLog('📨 Message received:', request);
    
    if (request.action === 'publishSite' || request.action === 'publish-site') {
      window.WebflowAPI.publishSite()
        .then(() => {
          console.log('✅ Site published successfully');
          
          // Play success sound if enabled
          if (CONFIG.soundEnabled) {
            playSuccessSound();
          }
          
          sendResponse({ success: true });
        })
        .catch(error => {
          console.error('❌ Publishing failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      return true;
    }
    
    if (request.action === 'refreshButtons') {
      // Reset the timeout to allow scanning again
      searchTimedOut = false;
      initTime = Date.now(); // Reset timer for another 10 seconds
      processedElements.clear(); // Clear processed elements to re-scan everything
      
      console.log('🔄 Refreshing buttons...');
      addToggleButtonsToNavigator();
      
      sendResponse({ success: true });
    }
  });
}

// Click the expand-all button in Navigator to reveal all nested elements
function clickExpandAllButton(navigatorPanel) {
  // Only try to expand once per few seconds to avoid excessive clicking
  if (window._lastExpandAllClick && (Date.now() - window._lastExpandAllClick < 3000)) {
    return false;
  }
  
  debugLog('🔍 Looking for "Expand All" button...');
  debugLog('   📍 Navigator panel element:', navigatorPanel);
  
  // Debug: Check what we're searching in
  if (!window._expandButtonDebugLogged) {
    debugLog('   🔍 Strategy 1: Looking for button[data-automation-id="collapse-expand-all-button"]');
    const test1 = navigatorPanel.querySelector('button[data-automation-id="collapse-expand-all-button"]');
    debugLog('      Result:', test1);
    
    debugLog('   🔍 Strategy 2: Looking for button[aria-label="Expand all"]');
    const test2 = navigatorPanel.querySelector('button[aria-label="Expand all"]');
    debugLog('      Result:', test2);
    
    debugLog('   � Strategy 3: Looking for svg[data-wf-icon="ExpandVerticalIcon"]');
    const test3 = navigatorPanel.querySelector('svg[data-wf-icon="ExpandVerticalIcon"]');
    debugLog('      Result:', test3);
    
    // Try searching in the whole document instead
    debugLog('   🔍 Trying in whole document:');
    const docTest1 = document.querySelector('button[data-automation-id="collapse-expand-all-button"]');
    debugLog('      Document button by automation-id:', docTest1);
    
    const docTest2 = document.querySelector('button[aria-label="Expand all"]');
    debugLog('      Document button by aria-label:', docTest2);
    
    // Show all buttons with data-automation-id
    const allAutoButtons = document.querySelectorAll('button[data-automation-id]');
    debugLog(`   📊 Total buttons with data-automation-id in document: ${allAutoButtons.length}`);
    debugLog('   📋 Sample automation IDs:', 
      Array.from(allAutoButtons).slice(0, 10).map(btn => btn.getAttribute('data-automation-id'))
    );
    
    window._expandButtonDebugLogged = true;
  }
  
  // Find the expand-all button using multiple strategies
  // Strategy 1: By data-automation-id
  let expandAllButton = navigatorPanel.querySelector('button[data-automation-id="collapse-expand-all-button"]');
  
  // Strategy 2: By aria-label
  if (!expandAllButton) {
    expandAllButton = navigatorPanel.querySelector('button[aria-label="Expand all"]');
  }
  
  // Strategy 3: By SVG icon
  if (!expandAllButton) {
    const expandAllSvg = navigatorPanel.querySelector('svg[data-wf-icon="ExpandVerticalIcon"]');
    if (expandAllSvg) {
      expandAllButton = expandAllSvg.closest('button');
    }
  }
  
  // Strategy 4: Search in whole document if not found in panel
  if (!expandAllButton) {
    expandAllButton = document.querySelector('button[data-automation-id="collapse-expand-all-button"]');
  }
  
  if (expandAllButton) {
    // Check the current state by aria-label
    const currentLabel = expandAllButton.getAttribute('aria-label');
    debugLog(`✅ Found button with state: "${currentLabel}"`);
    
    // Only click if it says "Expand all" (tree is collapsed)
    if (currentLabel === 'Expand all') {
      debugLog('   🌳 Expanding all nodes...');
      expandAllButton.click();
      window._lastExpandAllClick = Date.now();
      
      // Schedule a re-scan after expansion completes
      setTimeout(() => {
        debugLog('🔄 Re-scanning after expand-all...');
        addToggleButtonsToNavigator();
      }, 1000);
      
      return true;
    } else {
      debugLog('   ✅ Tree already expanded');
      return false; // Already expanded
    }
  }
  
  debugLog('⚠️ "Expand All" button not found anywhere');
  return false;
}

// Expand all tree nodes in the Navigator to reveal nested elements
function expandAllTreeNodes(navigatorPanel) {
  // First, try clicking the "Expand All" button
  const expandedViaButton = clickExpandAllButton(navigatorPanel);
  
  if (expandedViaButton) {
    // If we successfully clicked expand-all, return true to indicate we need to wait
    return true;
  }
  
  // Fallback: Manual expansion of individual nodes
  // Expand every few scans to catch newly added elements
  const shouldExpand = !window._lastExpansionTime || 
                      (Date.now() - window._lastExpansionTime > 2000);
  
  if (!shouldExpand) {
    return false;
  }
  
  debugLog('🌳 Manually expanding collapsed tree nodes...');
  window._lastExpansionTime = Date.now();
  
  // Find all collapsed nodes
  const expandableElements = navigatorPanel.querySelectorAll('[aria-expanded="false"]');
  debugLog(`   🎯 Found ${expandableElements.length} collapsed tree nodes`);
  
  let expandedCount = 0;
  
  expandableElements.forEach(element => {
    try {
      element.click();
      expandedCount++;
    } catch (e) {
      debugLog('   ⚠️ Failed to click expand button:', e);
    }
  });
  
  debugLog(`✅ Manually expanded ${expandedCount} tree nodes`);
  
  // If we expanded anything, schedule another scan and return true to wait
  if (expandedCount > 0 && !searchTimedOut) {
    setTimeout(() => {
      debugLog('🔄 Re-scanning after manual tree expansion...');
      addToggleButtonsToNavigator();
    }, 500);
    return true;
  }
  
  // No expansion needed, can proceed immediately
  return false;
}

// Add toggle buttons to Navigator panel
function addToggleButtonsToNavigator() {
  // Check if search time limit exceeded
  if (searchTimedOut) {
    return;
  }
  
  if (Date.now() - initTime > CONFIG.searchTimeLimit) {
    if (!searchTimedOut) {
      debugLog('⏱️ 10-second search limit reached. Stopping element search.');
      searchTimedOut = true;
    }
    return;
  }

  // Find the Navigator panel
  // Try multiple strategies to find the Navigator
  let navigatorPanel = document.querySelector('[data-panel-id="layers-panel"]') ||
                       document.querySelector('[data-panel-id="navigator-panel"]');
  
  // If not found by panel ID, try finding by the panel header
  if (!navigatorPanel) {
    const panelHeader = document.querySelector('[data-automation-id="panel-header"]');
    if (panelHeader) {
      // Check if this is the Navigator panel by looking for the title
      const title = panelHeader.querySelector('[data-automation-id="pane-title"]');
      if (title && title.textContent.trim() === 'Navigator') {
        // Get the parent panel container
        navigatorPanel = panelHeader.closest('[data-sc*="Pane"]') || panelHeader.parentElement;
      }
    }
  }
  
  // Fallback to other selectors
  if (!navigatorPanel) {
    navigatorPanel = document.querySelector('div[role="tree"]') ||
                    document.querySelector('[aria-label="Layers"]') ||
                    document.querySelector('[class*="LayersPanel"]') ||
                    document.querySelector('[class*="layers-panel"]');
  }
  
  if (!navigatorPanel) {
    debugLog('⚠️ Navigator panel not found');
    return;
  }
  
  // Log what we found (only once)
  if (!window._navigatorPanelLogged) {
    debugLog('✅ Found Navigator panel:', navigatorPanel.tagName, navigatorPanel.className);
    window._navigatorPanelLogged = true;
  }
  
  // Expand all collapsed tree nodes to make nested elements visible
  const needsToWaitForExpansion = expandAllTreeNodes(navigatorPanel);
  
  // If we just clicked the expand button, stop here and wait for the scheduled re-scan
  if (needsToWaitForExpansion) {
    debugLog('⏳ Waiting for tree expansion to complete before scanning...');
    return;
  }
  
  // Find canvas iframe
  const canvasFrame = document.querySelector('iframe#site-iframe-next') ||
                     document.querySelector('iframe[id*="site-iframe"]');
  
  if (!canvasFrame || !canvasFrame.contentDocument) {
    return;
  }
  
  const canvasDoc = canvasFrame.contentDocument;
  
  // Find all elements in canvas with our target attribute
  const canvasElements = canvasDoc.querySelectorAll(`[${CONFIG.targetAttribute}]`);
  
  if (canvasElements.length === 0) {
    return;
  }
  
  debugLog(`✅ Found ${canvasElements.length} elements with attribute "${CONFIG.targetAttribute}"`);
  
  // Process each canvas element
  canvasElements.forEach((canvasElement, index) => {
    let wfIdRaw = canvasElement.getAttribute('data-wf-id') || 
                  canvasElement.getAttribute('data-w-id');
    
    // Parse wf-id if it's in JSON format like ["uuid"]
    let wfId = wfIdRaw;
    try {
      if (wfIdRaw && wfIdRaw.startsWith('[') && wfIdRaw.endsWith(']')) {
        const parsed = JSON.parse(wfIdRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          wfId = parsed[0];
        }
      }
    } catch (e) {
      wfId = wfIdRaw;
    }
    
    debugLog(`🔍 Processing element ${index + 1}:`, {
      tag: canvasElement.tagName,
      id: canvasElement.id,
      classes: canvasElement.className,
      wfId: wfId
    });
    
    if (!wfId) {
      debugLog(`   ⚠️ Element has no wf-id, skipping`);
      return;
    }
    
    // Check if already processed
    const elementKey = wfId + '-' + CONFIG.targetAttribute;
    if (processedElements.has(elementKey)) {
      debugLog(`   ⏭️ Already processed, skipping`);
      return;
    }
    
    // Find corresponding Navigator item
    const navigatorItem = findNavigatorItemByWfId(navigatorPanel, wfId, wfIdRaw, canvasElement);
    
    if (!navigatorItem) {
      debugLog(`   ❌ Navigator item NOT found for wf-id: ${wfId}`);
      return;
    }
    
    debugLog(`   ✅ Found Navigator item`);
    
    // Check if button already exists
    if (navigatorItem.querySelector('.wf-ext-toggle-btn')) {
      debugLog(`   ⏭️ Button already exists, skipping`);
      return;
    }
    
    // Mark as processed
    processedElements.add(elementKey);
    
    // Add button to Navigator item
    addButtonToNavigatorItem(navigatorItem, canvasElement, wfId);
  });
}

// Find Navigator item by Webflow ID
function findNavigatorItemByWfId(navigatorPanel, wfId, wfIdRaw, canvasElement) {
  debugLog(`      🔎 Searching for wf-id: "${wfId}"`);
  
  // Strategy 1: Direct attribute match with parsed ID - search in WHOLE DOCUMENT
  let item = document.querySelector(`[data-wf-id="${wfId}"]`) ||
             document.querySelector(`[data-w-id="${wfId}"]`) ||
             document.querySelector(`[data-node-id="${wfId}"]`);
  
  if (item) {
    debugLog(`      ✅ Found by wf-id attribute in document!`);
    return item;
  }
  
  // Strategy 2: Try with raw ID (JSON format) - search in WHOLE DOCUMENT
  if (wfIdRaw && wfIdRaw !== wfId) {
    item = document.querySelector(`[data-wf-id='${wfIdRaw}']`) ||
           document.querySelector(`[data-w-id='${wfIdRaw}']`);
    
    if (item) {
      debugLog(`      ✅ Found by raw wf-id in document!`);
      return item;
    }
  }
  
  // Strategy 3: Search by element properties (class name, ID, tag)
  const elementClasses = canvasElement.className.split(' ').filter(c => c.length > 0 && c.length < 50);
  const elementTag = canvasElement.tagName.toLowerCase();
  const elementId = canvasElement.id;
  
  debugLog(`      🔍 Searching by: tag="${elementTag}", id="${elementId}", classes=`, elementClasses);
  
  // Get all text-containing elements in WHOLE DOCUMENT (not just Navigator panel)
  const allElements = document.querySelectorAll('div, span, p, label');
  debugLog(`      📊 Searching through ${allElements.length} elements in document`);
  
  let bestMatch = null;
  let bestMatchScore = 0;
  
  // Try to match by element ID first (most specific)
  if (elementId) {
    for (const el of allElements) {
      if (el.querySelector('.wf-ext-toggle-btn')) continue;
      
      const textContent = el.textContent?.trim();
      if (textContent === elementId || textContent === `#${elementId}`) {
        const treeItem = el.closest('[class*="tree"], [class*="item"], [class*="row"], [class*="node"], [class*="layer"]') || el.parentElement;
        if (treeItem && !treeItem.querySelector('.wf-ext-toggle-btn')) {
          debugLog(`      ✅ Found by element ID: "${elementId}"`);
          return treeItem;
        }
      }
    }
  }
  
  // Try to match by class name
  if (elementClasses.length > 0) {
    // Debug: On first unmatched element, show sample Navigator text content
    if (!window._navigatorTextSamplesLogged && elementClasses.includes('modal_dialog')) {
      debugLog('      🔍 DEBUG: Searching for modal_dialog elements in Navigator...');
      const sampleTexts = [];
      const allTexts = [];
      
      for (let i = 0; i < Math.min(200, allElements.length); i++) {
        const el = allElements[i];
        
        // Get direct text
        let directText = '';
        for (const node of el.childNodes) {
          if (node.nodeType === Node.TEXT_NODE) {
            directText += node.textContent.trim();
          }
        }
        
        // Also get full text content
        const fullText = el.textContent?.trim();
        
        if (directText && directText.length > 0 && directText.length < 50) {
          sampleTexts.push(directText);
        }
        
        // Look for anything that might be a dialog or modal
        if (fullText && (fullText.toLowerCase().includes('modal') || 
                        fullText.toLowerCase().includes('dialog') ||
                        fullText.toLowerCase().includes('ahoi') ||
                        fullText.toLowerCase().includes('foerderer'))) {
          allTexts.push({
            direct: directText,
            full: fullText.substring(0, 100),
            element: el
          });
        }
      }
      
      debugLog('         Sample direct texts:', sampleTexts.slice(0, 30));
      debugLog('         Elements containing modal/dialog/ahoi/foerderer:', allTexts);
      window._navigatorTextSamplesLogged = true;
    }
    
    for (const el of allElements) {
      if (el.querySelector('.wf-ext-toggle-btn')) continue;
      
      // Get only direct text content (not from nested children)
      let directText = '';
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          directText += node.textContent.trim();
        }
      }
      
      if (!directText || directText.length > 100) continue;
      
      const directTextLower = directText.toLowerCase();
      
      // Check against each class name
      for (const className of elementClasses) {
        let matchScore = 0;
        
        if (directText === className) {
          matchScore = 3; // Exact match
        } else if (directTextLower === className.toLowerCase()) {
          matchScore = 2; // Case-insensitive match
        } else if (directText.length < 30 && directTextLower.includes(className.toLowerCase())) {
          matchScore = 1; // Partial match
        }
        
        if (matchScore > bestMatchScore) {
          const treeItem = el.closest('[class*="tree"], [class*="item"], [class*="row"], [class*="node"], [class*="layer"]') || el.parentElement;
          
          if (treeItem && !treeItem.querySelector('.wf-ext-toggle-btn')) {
            bestMatch = treeItem;
            bestMatchScore = matchScore;
            
            if (matchScore === 3) {
              debugLog(`      ✅ Found exact match by class: "${className}"`);
              return bestMatch;
            }
          }
        }
      }
    }
  }
  
  if (bestMatch) {
    debugLog(`      ✅ Found match (score: ${bestMatchScore})`);
    return bestMatch;
  }
  
  debugLog(`      ❌ No Navigator match found`);
  return null;
}

// Add toggle button to Navigator item
function addButtonToNavigatorItem(navigatorItem, canvasElement, wfId) {
  if (navigatorItem.querySelector('.wf-ext-toggle-btn')) {
    return;
  }
  
  debugLog(`➕ Adding button for wf-id: ${wfId}`);
  
  const button = document.createElement('button');
  button.className = 'wf-ext-toggle-btn';
  button.innerHTML = CONFIG.iconHTML;
  button.title = `Toggle ${CONFIG.targetAttribute}`;
  
  // Compact button styling for Navigator
  Object.assign(button.style, {
    width: '18px',
    height: '18px',
    borderRadius: '3px',
    border: '1px solid #146EF5',
    background: 'white',
    cursor: 'pointer',
    fontSize: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '6px',
    padding: '0',
    verticalAlign: 'middle',
    transition: 'all 0.15s ease',
    flexShrink: '0',
    fontFamily: 'system-ui, -apple-system, sans-serif'
  });
  
  // Set initial button state
  updateButtonState(button, canvasElement);
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    debugLog('🖱️ Toggle button clicked for wf-id:', wfId);
    
    // Toggle the attribute
    const currentValue = canvasElement.getAttribute(CONFIG.toggleAttribute);
    const newValue = currentValue === 'true' ? 'false' : 'true';
    
    canvasElement.setAttribute(CONFIG.toggleAttribute, newValue);
    debugLog(`✅ Toggled ${CONFIG.toggleAttribute}: ${currentValue} → ${newValue}`);
    
    // Update button appearance
    updateButtonState(button, canvasElement);
  });
  
  // Insert button into Navigator item
  const nameElement = navigatorItem.querySelector('[class*="name"]') ||
                     navigatorItem.querySelector('[class*="label"]') ||
                     navigatorItem.querySelector('span');
  
  if (nameElement) {
    nameElement.appendChild(button);
  } else {
    navigatorItem.appendChild(button);
  }
  
  debugLog('✅ Button added');
}

// Update button visual state based on attribute value
function updateButtonState(button, element) {
  const value = element.getAttribute(CONFIG.toggleAttribute);
  
  if (value === 'true') {
    button.style.background = '#146EF5';
    button.style.color = 'white';
    button.style.borderColor = '#146EF5';
  } else {
    button.style.background = 'white';
    button.style.color = '#146EF5';
    button.style.borderColor = '#146EF5';
  }
}

// Start observing DOM for changes
function startObserving() {
  const observer = new MutationObserver((mutations) => {
    if (!searchTimedOut) {
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.addedNodes.length > 0 || 
        mutation.removedNodes.length > 0
      );
      
      if (hasRelevantChanges) {
        // Debounce to prevent excessive re-scans
        if (mutationDebounceTimer) {
          clearTimeout(mutationDebounceTimer);
        }
        
        mutationDebounceTimer = setTimeout(() => {
          debugLog('🔄 DOM changed, re-scanning...');
          addToggleButtonsToNavigator();
        }, 300); // Wait 300ms after last change before scanning
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  debugLog('👀 DOM observer started');
}

// Play success sound when publishing completes
function playSuccessSound() {
  try {
    debugLog('🔊 Playing success sound...');
    const soundUrl = chrome.runtime.getURL('assets/sounds/complete.mp3');
    const audio = new Audio(soundUrl);
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.playbackRate = 1.0;
    
    audio.addEventListener('loadedmetadata', () => {
      debugLog('🎵 Audio metadata loaded, duration:', audio.duration, 'seconds');
      audio.currentTime = 0;
    });
    
    audio.play()
      .then(() => {
        debugLog('✅ Sound playing');
      })
      .catch(error => {
        console.error('❌ Error playing sound:', error);
      });
  } catch (error) {
    console.error('❌ Error creating audio:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}



