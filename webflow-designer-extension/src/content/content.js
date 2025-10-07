// Webflow Designer Extension - Content Script
// Adds toggle buttons to Navigator panel for elements with custom attributes

console.log('🚀 Webflow Designer Extension loaded');

// Configuration
const CONFIG = {
  targetAttribute: 'data-show-in-designer',
  toggleAttribute: 'data-show-in-designer',
  iconHTML: '👁️',
  checkInterval: 2000,
  soundEnabled: true,
  searchTimeLimit: 15000, // Stop automatic searching after 15 seconds
  debugMode: true
};

// Track initialization and processed elements
let initTime = Date.now();
let searchTimedOut = false;
let processedElements = new Set();
let mutationDebounceTimer = null;
const navigatorItemCache = new Map();

// Helper function for debug logging
function debugLog(...args) {
  if (CONFIG.debugMode) {
    console.log(...args);
  }
}

// Initialize the extension
async function init() {
  debugLog('✨ Webflow Designer Extension initialized');
  
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
  
  // Periodic checks for first 15 seconds
  const checkInterval = setInterval(() => {
    if (Date.now() - initTime > CONFIG.searchTimeLimit) {
      clearInterval(checkInterval);
      debugLog('⏱️ Search period ended');
      searchTimedOut = true;
    } else {
      addToggleButtonsToNavigator();
    }
  }, CONFIG.checkInterval);
  
  // Additional scans in the first few seconds
  setTimeout(() => addToggleButtonsToNavigator(), 1000);
  setTimeout(() => addToggleButtonsToNavigator(), 3000);
  setTimeout(() => addToggleButtonsToNavigator(), 5000);
  setTimeout(() => addToggleButtonsToNavigator(), 7000);
  setTimeout(() => addToggleButtonsToNavigator(), 10000);
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    debugLog('📨 Message received:', request);
    
    if (request.action === 'publishSite' || request.action === 'publish-site') {
      window.WebflowAPI.publishSite()
        .then(() => {
          console.log('✅ Site published successfully');
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
      searchTimedOut = false;
      initTime = Date.now();
      processedElements.clear();
      console.log('🔄 Refreshing buttons...');
      addToggleButtonsToNavigator();
      sendResponse({ success: true });
    }
  });
}

// Main function to add toggle buttons
function addToggleButtonsToNavigator(options = {}) {
  const { force = false, reason = 'standard' } = options;

  if (!force) {
    if (searchTimedOut) {
      return;
    }

    if (Date.now() - initTime > CONFIG.searchTimeLimit) {
      if (!searchTimedOut) {
        debugLog('⏱️ Search limit reached. Stopping automatic search.');
        searchTimedOut = true;
      }
      return;
    }
  } else {
    debugLog(`⏩ Force-running addToggleButtonsToNavigator (reason: ${reason})`);
  }

  // Find the Navigator panel
  const navigatorPanel = document.querySelector('[data-automation-id="navigator-panel"]');
  
  if (!navigatorPanel) {
    debugLog('⚠️ Navigator panel not found');
    return;
  }
  
  if (!window._navigatorPanelLogged) {
    debugLog('✅ Found Navigator panel');
    window._navigatorPanelLogged = true;
    startNavigatorObserver(navigatorPanel);
  }
  
  // Try to expand tree nodes manually
  expandTreeNodesManually(navigatorPanel);
  
  // Find canvas iframe
  const canvasFrame = document.querySelector('iframe#site-iframe-next') ||
                     document.querySelector('iframe[id*="site-iframe"]');
  
  if (!canvasFrame || !canvasFrame.contentDocument) {
    debugLog('⚠️ Canvas iframe not found');
    return;
  }
  
  const canvasDoc = canvasFrame.contentDocument;
  
  // Find all elements in canvas with our target attribute
  const canvasElements = canvasDoc.querySelectorAll(`[${CONFIG.targetAttribute}]`);
  
  if (canvasElements.length === 0) {
    return;
  }
  
  debugLog(`✅ Found ${canvasElements.length} elements with attribute "${CONFIG.targetAttribute}"`);
  debugLog(`   📊 Already processed: ${processedElements.size} elements`);
  
  // Process each canvas element
  canvasElements.forEach((canvasElement, index) => {
    const elementId = canvasElement.id;
    const elementClasses = canvasElement.className.split(' ').filter(c => c && c.length > 0 && c.length < 100);
    
    // Create a truly unique key for this element by including its DOM path
    // This handles multiple elements with the same ID/class (like modal_dialog instances)
    const getElementPath = (el) => {
      const path = [];
      let current = el;
      while (current && current !== canvasDoc.body) {
        const id = current.id;
        const className = current.className.split(' ')[0];
        const tagName = current.tagName.toLowerCase();
        
        // Create a unique segment for this element
        if (id) {
          path.unshift(`${tagName}#${id}`);
        } else if (className) {
          // Include sibling index for elements with same class
          const siblings = Array.from(current.parentElement?.children || []).filter(
            c => c.tagName === current.tagName && c.className.split(' ')[0] === className
          );
          const siblingIndex = siblings.indexOf(current);
          path.unshift(`${tagName}.${className}[${siblingIndex}]`);
        } else {
          const siblingIndex = Array.from(current.parentElement?.children || []).indexOf(current);
          path.unshift(`${tagName}[${siblingIndex}]`);
        }
        
        current = current.parentElement;
      }
      return path.join(' > ');
    };
    
    const elementKey = getElementPath(canvasElement);
    
    debugLog(`🔍 Processing element ${index + 1}/${canvasElements.length}: id="${elementId}", classes=[${elementClasses.join(', ')}]`);
    
    // Find corresponding Navigator item
  const navigatorItem = findNavigatorItemByElement(navigatorPanel, elementId, elementClasses, canvasElement, elementKey);
    
    if (!navigatorItem) {
      debugLog(`   ❌ Navigator item NOT found for: ${elementKey}`);
      return;
    }
    
    debugLog(`   ✅ Found Navigator item for: ${elementKey}`);
    
    // Check if button already exists for THIS specific element
    const existingButton = Array.from(navigatorItem.querySelectorAll('.wf-ext-toggle-btn'))
      .find(btn => btn.getAttribute('data-element-key') === elementKey);
    if (existingButton) {
      debugLog(`   ⏭️ Button already exists for: ${elementKey}`);
      placeButtonInNavigator(existingButton, navigatorItem, elementKey);
      updateButtonState(existingButton, canvasElement);
      processedElements.add(elementKey); // Track that we've seen this
      return;
    }
    
    // Remove any old buttons that might be incorrectly attached (from previous buggy runs)
    const oldButtons = navigatorItem.querySelectorAll('.wf-ext-toggle-btn');
    oldButtons.forEach(btn => {
      const btnKey = btn.getAttribute('data-element-key');
      if (!btnKey || btnKey !== elementKey) {
        debugLog(`   🗑️ Removing old/incorrect button from Navigator item`);
        btn.remove();
      }
    });
    
    // Mark as processed
    processedElements.add(elementKey);
    
    // Add button to Navigator item
    addButtonToNavigatorItem(navigatorItem, canvasElement, elementKey);
  });
}

// Expand only the parent elements that contain our target elements
function expandTreeNodesManually(navigatorPanel) {
  debugLog(`🌳 Looking for parent elements to expand...`);
  
  // Get the canvas to find all elements with data-show-in-designer
  const canvas = document.querySelector('iframe#site-iframe-next');
  if (!canvas || !canvas.contentDocument) {
    debugLog('   ⚠️ Canvas iframe not found');
    return false;
  }
  
  const canvasBody = canvas.contentDocument.body;
  const targetElements = canvasBody.querySelectorAll('[data-show-in-designer]');
  
  debugLog(`   📍 Found ${targetElements.length} elements with data-show-in-designer in canvas`);
  
  if (targetElements.length === 0) {
    return false;
  }
  
  let expandedCount = 0;
  const expandedPaths = new Set();
  
  // For each target element, find its path of parent IDs
  targetElements.forEach(element => {
    const elementId = element.id || element.getAttribute('data-automation-id') || element.className.split(' ')[0];
    debugLog(`   🎯 Processing target element: ${elementId}`);
    
    // Build the path from root to this element
    const pathIds = [];
    let current = element.parentElement;
    
    while (current && current !== canvasBody) {
      const parentId = current.id || current.getAttribute('data-automation-id') || current.className.split(' ')[0];
      if (parentId) {
        pathIds.unshift(parentId); // Add to beginning
      }
      current = current.parentElement;
    }
    
    debugLog(`      Path to element: ${pathIds.join(' > ')}`);
    
    // Now expand each parent in the navigator
    pathIds.forEach((parentId, depth) => {
      const pathKey = pathIds.slice(0, depth + 1).join('>');
      
      // Skip if we already expanded this path
      if (expandedPaths.has(pathKey)) {
        return;
      }
      
      // Find the navigator item for this parent
      const navigatorItems = navigatorPanel.querySelectorAll('[data-legacy-ds="ListItem"]');
      
      for (const navItem of navigatorItems) {
        const label = navItem.querySelector('[data-navigator-label="true"]');
        if (!label) continue;
        
        const labelText = label.textContent.trim();
        
        // Try to match this navigator item to the parent ID
        if (labelText.includes(parentId) || parentId.includes(labelText)) {
          // Check if this item has children and is collapsed
          const expandButton = navItem.querySelector('[data-automation-id="navigator-expand-collapse-caret-button"]');
          
          if (expandButton) {
            const itemDepth = parseInt(navItem.getAttribute('data-depth') || '0');
            const nextSibling = navItem.nextElementSibling;
            const isExpanded = nextSibling && 
                              nextSibling.getAttribute('data-legacy-ds') === 'ListItem' &&
                              parseInt(nextSibling.getAttribute('data-depth') || '0') > itemDepth;
            
            if (!isExpanded) {
              debugLog(`      🔽 Expanding parent "${labelText}" at depth ${itemDepth}`);
              try {
                expandButton.click();
                expandedCount++;
                expandedPaths.add(pathKey);
              } catch (e) {
                debugLog(`      ⚠️ Error expanding:`, e);
              }
            } else {
              expandedPaths.add(pathKey);
            }
          }
          
          break; // Found the matching navigator item
        }
      }
    });
  });
  
  debugLog(`✅ Expanded ${expandedCount} parent elements`);
  
  // If we expanded anything, do rescans
  if (expandedCount > 0) {
    setTimeout(() => {
      debugLog('🔄 Rescan after parent expansion (300ms)...');
      addToggleButtonsToNavigator({ force: true, reason: 'parent expansion' });
    }, 300);
    
    setTimeout(() => {
      debugLog('🔄 Rescan after parent expansion (800ms)...');
      addToggleButtonsToNavigator({ force: true, reason: 'parent expansion' });
    }, 800);
    
    setTimeout(() => {
      debugLog('🔄 Final rescan after parent expansion (1500ms)...');
      addToggleButtonsToNavigator({ force: true, reason: 'parent expansion' });
    }, 1500);
  }
  
  return expandedCount > 0;
}

// Legacy expand all function (keeping as backup)
function expandAllTreeNodes(navigatorPanel) {
  // Click the "Expand All" button if available
  const expandAllButton = navigatorPanel.querySelector('button[data-automation-id="collapse-expand-all-button"]');
  
  if (expandAllButton) {
    const ariaLabel = expandAllButton.getAttribute('aria-label');
    
    if (ariaLabel === 'Expand all') {
      debugLog('🌳 Clicking "Expand All" button...');
      expandAllButton.click();
      
      // Schedule multiple rescans after expansion to catch all nested elements
      // Webflow loads nested elements progressively, so we need many attempts
      setTimeout(() => {
        debugLog('🔄 Rescan 1 after expansion...');
        addToggleButtonsToNavigator({ force: true, reason: 'expand all' });
      }, 200);
      
      setTimeout(() => {
        debugLog('🔄 Rescan 2 after expansion...');
        addToggleButtonsToNavigator({ force: true, reason: 'expand all' });
      }, 500);
      
      setTimeout(() => {
        debugLog('🔄 Rescan 3 after expansion...');
        addToggleButtonsToNavigator({ force: true, reason: 'expand all' });
      }, 1000);
      
      setTimeout(() => {
        debugLog('🔄 Rescan 4 after expansion...');
        addToggleButtonsToNavigator({ force: true, reason: 'expand all' });
      }, 1500);
      
      setTimeout(() => {
        debugLog('🔄 Rescan 5 after expansion...');
        addToggleButtonsToNavigator({ force: true, reason: 'expand all' });
      }, 2000);
      
      setTimeout(() => {
        debugLog('🔄 Rescan 6 after expansion...');
        addToggleButtonsToNavigator({ force: true, reason: 'expand all' });
      }, 3000);
      
      return true;
    } else {
      debugLog('✅ Tree already expanded');
    }
  }
  
  return false;
}

// Find Navigator item by element properties
function isNavigatorItemAvailable(item, elementKey) {
  if (!item) return false;
  const assignedKey = item.getAttribute('data-wf-ext-element-key');
  return !assignedKey || assignedKey === elementKey;
}

function assignNavigatorItem(item, elementKey) {
  if (!item) return null;

  const previousKey = item.getAttribute('data-wf-ext-element-key');
  if (previousKey && previousKey !== elementKey) {
    navigatorItemCache.delete(previousKey);
  }

  item.setAttribute('data-wf-ext-element-key', elementKey);
  navigatorItemCache.set(elementKey, item);
  return item;
}

function findNavigatorItemByElement(navigatorPanel, elementId, elementClasses, canvasElement, elementKey) {
  // All navigator items have data-legacy-ds="ListItem"
  const navigatorItems = navigatorPanel.querySelectorAll('[data-legacy-ds="ListItem"]');
  
  if (navigatorItems.length === 0) {
    debugLog('      ⚠️ No navigator items found');
    return null;
  }

  if (elementKey) {
    const cachedItem = navigatorItemCache.get(elementKey);
    if (cachedItem && cachedItem.isConnected && document.contains(cachedItem)) {
      debugLog('      🔁 Using cached navigator item');
      return assignNavigatorItem(cachedItem, elementKey);
    }
    if (cachedItem && (!cachedItem.isConnected || !document.contains(cachedItem))) {
      navigatorItemCache.delete(elementKey);
    }
  }

  if (elementKey) {
    const keyedMatch = navigatorPanel.querySelector(`[data-wf-ext-element-key="${CSS.escape(elementKey)}"]`);
    if (keyedMatch) {
      debugLog('      🔁 Reusing navigator item by stored element key');
      return assignNavigatorItem(keyedMatch, elementKey);
    }
  }
  
  if (!window._navigatorItemsLogged) {
    debugLog(`      📊 Found ${navigatorItems.length} navigator items total`);
    
    // Log first 20 navigator item labels for debugging
    const labels = Array.from(navigatorItems).slice(0, 20).map(item => {
      const label = item.querySelector('[data-navigator-label="true"]');
      return label ? label.textContent.trim() : '(no label)';
    });
    debugLog(`      📋 Sample navigator labels: [${labels.join(', ')}]`);
    
    window._navigatorItemsLogged = true;
  }
  
  // NEW Strategy: Match by DOM path - build path from canvas element and find matching navigator path
  // This is the most reliable for duplicate class names
  const canvas = document.querySelector('iframe#site-iframe-next');
  if (canvas && canvas.contentDocument) {
    const canvasBody = canvas.contentDocument.body;

    const getCanvasLabel = (el) => {
      if (!el) return '';
      if (el.id) return el.id;
      const classList = Array.from(el.classList || []).filter(Boolean);
      if (classList.length > 0) {
        return classList.join(' ');
      }
      return el.tagName ? el.tagName.toLowerCase() : '';
    };

    const buildCanvasPath = (el) => {
      const path = [];
      let current = el;
      while (current && current !== canvasBody) {
        const label = getCanvasLabel(current) || '(no-label)';
        let siblingIndex = 0;
        let sibling = current.previousElementSibling;
        while (sibling) {
          if (getCanvasLabel(sibling) === label) {
            siblingIndex++;
          }
          sibling = sibling.previousElementSibling;
        }
        path.unshift(`${label}::${siblingIndex}`);
        current = current.parentElement;
      }
      return path;
    };

    const getNavigatorLabel = (item) => {
      const labelNode = item.querySelector('[data-navigator-label="true"]');
      return labelNode ? labelNode.textContent.trim() : '';
    };

    const buildNavPath = (navItem) => {
      const path = [];
      const allNavItems = Array.from(navigatorItems);
      const currentIndex = allNavItems.indexOf(navItem);

      if (currentIndex === -1) {
        return path;
      }

      let targetDepth = parseInt(navItem.getAttribute('data-depth') || '0');

      for (let i = currentIndex; i >= 0 && targetDepth >= 0; i--) {
        const candidate = allNavItems[i];
        const candidateDepth = parseInt(candidate.getAttribute('data-depth') || '0');

        if (candidateDepth === targetDepth) {
          const labelText = getNavigatorLabel(candidate) || '(no-label)';
          let siblingIndex = 0;

          for (let j = i - 1; j >= 0; j--) {
            const prevItem = allNavItems[j];
            const prevDepth = parseInt(prevItem.getAttribute('data-depth') || '0');

            if (prevDepth < candidateDepth) {
              if (prevDepth === candidateDepth - 1) {
                break;
              }
              continue;
            }

            if (prevDepth === candidateDepth) {
              const prevLabel = getNavigatorLabel(prevItem) || '(no-label)';
              if (prevLabel === labelText) {
                siblingIndex++;
              }
            }
          }

          path.unshift(`${labelText}::${siblingIndex}`);
          targetDepth = candidateDepth - 1;
        }
      }

      return path;
    };

    const canvasPath = buildCanvasPath(canvasElement);
    debugLog(`      🗺️ Canvas path: [${canvasPath.join(' > ')}]`);

    for (const item of navigatorItems) {
      if (!isNavigatorItemAvailable(item, elementKey)) {
        continue;
      }

      const label = getNavigatorLabel(item);

      const matchesElement = elementId ? label === elementId :
        elementClasses.some(c => label === c || label.includes(c) || c.includes(label));

      if (!matchesElement) {
        continue;
      }

      const navPath = buildNavPath(item);
      debugLog(`      🗺️ Nav path: [${navPath.join(' > ')}]`);

      if (canvasPath.length === navPath.length) {
        const pathsMatch = canvasPath.every((segment, idx) => segment === navPath[idx]);

        if (pathsMatch) {
          debugLog(`      ✅ Found by DOM path match!`);
          return assignNavigatorItem(item, elementKey);
        }
      }
    }
  }
  
  // Strategy 1: Match by element ID (most reliable)
  if (elementId) {
    for (const item of navigatorItems) {
      if (!isNavigatorItemAvailable(item, elementKey)) {
        continue;
      }
      const label = item.querySelector('[data-navigator-label="true"]');
      if (label && label.textContent.trim() === elementId) {
        debugLog(`      ✅ Found by ID: "${elementId}"`);
        return assignNavigatorItem(item, elementKey);
      }
    }
  }
  
  // Strategy 2: Match by class name (most common for Webflow elements)
  if (elementClasses.length > 0) {
    // First try matching ALL classes together (for combo classes)
    const allClassesString = elementClasses.join(' ');
    for (const item of navigatorItems) {
      if (!isNavigatorItemAvailable(item, elementKey)) {
        continue;
      }
      const label = item.querySelector('[data-navigator-label="true"]');
      const labelText = label ? label.textContent.trim() : '';
      
      // Exact match with all classes
      if (labelText === allClassesString) {
        debugLog(`      ✅ Found exact match by combo classes: "${allClassesString}"`);
        return assignNavigatorItem(item, elementKey);
      }
      
      // Check if label contains all the classes (in any order)
      const labelClasses = labelText.split(' ');
      const allClassesMatch = elementClasses.every(c => labelClasses.includes(c));
      if (allClassesMatch && labelClasses.length === elementClasses.length) {
        debugLog(`      ✅ Found match by all classes (reordered): "${labelText}"`);
        return assignNavigatorItem(item, elementKey);
      }
    }
    
    // Try individual class matching
    for (const className of elementClasses) {
      for (const item of navigatorItems) {
        if (!isNavigatorItemAvailable(item, elementKey)) {
          continue;
        }
        const label = item.querySelector('[data-navigator-label="true"]');
        const labelText = label ? label.textContent.trim() : '';
        
        if (labelText === className) {
          debugLog(`      ✅ Found exact match by single class: "${className}"`);
          return assignNavigatorItem(item, elementKey);
        }
      }
    }
    
    // Try partial/fuzzy matching
    for (const className of elementClasses) {
      for (const item of navigatorItems) {
        if (!isNavigatorItemAvailable(item, elementKey)) {
          continue;
        }
        const label = item.querySelector('[data-navigator-label="true"]');
        const labelText = label ? label.textContent.trim() : '';
        
        // Check if class name contains label or label contains class name
        if (labelText && (
          className.toLowerCase().includes(labelText.toLowerCase()) ||
          labelText.toLowerCase().includes(className.toLowerCase())
        )) {
          debugLog(`      ✅ Found fuzzy match: class="${className}" ~ label="${labelText}"`);
          return assignNavigatorItem(item, elementKey);
        }
      }
    }
  }
  
  // Strategy 3: Match by data-automation-id attribute
  if (elementId) {
    const automationIdMatch = navigatorPanel.querySelector(`[data-automation-id*="${elementId}"]`);
    if (automationIdMatch) {
      const item = automationIdMatch.closest('[data-legacy-ds="ListItem"]');
      if (item) {
        debugLog(`      ✅ Found by automation-id: "${elementId}"`);
        if (!isNavigatorItemAvailable(item, elementKey)) {
          return null;
        }
        return assignNavigatorItem(item, elementKey);
      }
    }
  }
  
  for (const className of elementClasses) {
    const automationIdMatch = navigatorPanel.querySelector(`[data-automation-id*="${className}"]`);
    if (automationIdMatch) {
      const item = automationIdMatch.closest('[data-legacy-ds="ListItem"]');
      if (item) {
        debugLog(`      ✅ Found by automation-id class: "${className}"`);
        if (!isNavigatorItemAvailable(item, elementKey)) {
          continue;
        }
        return assignNavigatorItem(item, elementKey);
      }
    }
  }
  
  debugLog(`      ❌ No match found for ID="${elementId}" or classes=[${elementClasses.join(', ')}]`);
  return null;
}

// Add toggle button to Navigator item
function addButtonToNavigatorItem(navigatorItem, canvasElement, elementKey) {
  debugLog(`➕ Adding button for element: ${elementKey}`);
  
  const button = document.createElement('button');
  button.className = 'wf-ext-toggle-btn';
  button.setAttribute('data-element-key', elementKey); // Store element key for identification
  button.innerHTML = CONFIG.iconHTML;
  button.title = `Toggle ${CONFIG.targetAttribute}`;
  
  // Button styling
  Object.assign(button.style, {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    border: '1.5px solid #146EF5',
    background: 'white',
    cursor: 'pointer',
    fontSize: '10px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: '6px',
    marginRight: '2px',
    padding: '0',
    verticalAlign: 'middle',
    transition: 'all 0.15s ease',
    flexShrink: '0',
    position: 'relative',
    zIndex: '9999',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)'
  });
  
  // Set initial button state
  updateButtonState(button, canvasElement);
  
  // Add click handler
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    
    debugLog('🖱️ Toggle button clicked for:', elementKey);
    
    // Toggle the attribute
    const currentValue = canvasElement.getAttribute(CONFIG.toggleAttribute);
    const newValue = currentValue === 'true' ? 'false' : 'true';
    
    canvasElement.setAttribute(CONFIG.toggleAttribute, newValue);
    debugLog(`✅ Toggled ${CONFIG.toggleAttribute}: ${currentValue} → ${newValue}`);
    
    // Update button appearance
    updateButtonState(button, canvasElement);
  });
  
  // Insert button into the appropriate location
  // The structure is: ListItem > content wrapper > label wrapper > label + spacer + icons
  // We want to add the button in the icons area (after the spacer)
  
  const inserted = placeButtonInNavigator(button, navigatorItem, elementKey);
  if (!inserted) {
    debugLog('❌ Button could not be positioned in navigator');
  }
}

function placeButtonInNavigator(button, navigatorItem, elementKey) {
  const spacer = navigatorItem.querySelector('[data-automation-id^="navigator-node-spacer"]');
  if (spacer) {
    if (!spacer.dataset.wfExtAdjusted) {
      const computedStyles = window.getComputedStyle(spacer);
      const currentPaddingRight = parseFloat(computedStyles.paddingRight) || 0;
      const desiredPadding = Math.max(currentPaddingRight, 28);
      spacer.style.position = spacer.style.position || 'relative';
      spacer.style.paddingRight = `${desiredPadding}px`;
      spacer.dataset.wfExtAdjusted = 'true';
    }

    Object.assign(button.style, {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '0',
      marginRight: '0',
      opacity: '1',
      pointerEvents: 'auto'
    });

    if (button.parentElement !== spacer) {
      spacer.appendChild(button);
      debugLog('   ✅ Button appended to spacer');
    }

    const addedViaSpacer = Array.from(spacer.querySelectorAll('.wf-ext-toggle-btn'))
      .find(btn => btn.getAttribute('data-element-key') === elementKey);
    if (addedViaSpacer) {
      debugLog('✅ Button successfully added to DOM');
      return true;
    }
  }

  const contentWrapper = navigatorItem.querySelector('[data-automation-id="navigator-node-content"]') ||
                         navigatorItem.querySelector('[data-automation-id*="navigator-node"]') ||
                         navigatorItem;

  if (!contentWrapper) {
    debugLog('   ❌ Could not find content wrapper to insert button');
    return false;
  }

  if (!contentWrapper.dataset.wfExtAdjusted) {
    const computedStyles = window.getComputedStyle(contentWrapper);
    const currentPaddingRight = parseFloat(computedStyles.paddingRight) || 0;
    const desiredPadding = Math.max(currentPaddingRight, 28);
    contentWrapper.style.position = contentWrapper.style.position || 'relative';
    contentWrapper.style.paddingRight = `${desiredPadding}px`;
    contentWrapper.dataset.wfExtAdjusted = 'true';
  }

  Object.assign(button.style, {
    position: 'absolute',
    right: '8px',
    top: '50%',
    transform: 'translateY(-50%)',
    marginLeft: '0',
    marginRight: '0',
    opacity: '1',
    pointerEvents: 'auto'
  });

  if (button.parentElement !== contentWrapper) {
    contentWrapper.appendChild(button);
    debugLog('   ✅ Button appended to content wrapper');
  }

  const addedButton = Array.from(contentWrapper.querySelectorAll('.wf-ext-toggle-btn'))
    .find(btn => btn.getAttribute('data-element-key') === elementKey);
  if (addedButton) {
    debugLog('✅ Button successfully added to DOM');
    return true;
  }

  debugLog('❌ Button was added but cannot be found');
  return false;
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
    const hasRelevantChanges = mutations.some(mutation => 
      mutation.addedNodes.length > 0 || 
      mutation.removedNodes.length > 0
    );
    
    if (hasRelevantChanges) {
      if (mutationDebounceTimer) {
        clearTimeout(mutationDebounceTimer);
      }
      
      mutationDebounceTimer = setTimeout(() => {
        debugLog('🔄 DOM changed, re-scanning...');
        addToggleButtonsToNavigator({ force: true, reason: 'dom mutation' });
      }, 200);
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  debugLog('👀 DOM observer started');
}

// Start observing Navigator panel for tree expansions
function startNavigatorObserver(navigatorPanel) {
  if (window._navigatorObserver) {
    return;
  }
  
  debugLog('👁️ Starting Navigator panel observer...');
  
  window._navigatorObserver = new MutationObserver((mutations) => {
    const hasNewItems = mutations.some(mutation => {
      return Array.from(mutation.addedNodes).some(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          return node.matches && (
            node.matches('[data-legacy-ds="ListItem"]') ||
            node.querySelector('[data-legacy-ds="ListItem"]')
          );
        }
        return false;
      });
    });
    
    if (hasNewItems) {
      if (mutationDebounceTimer) {
        clearTimeout(mutationDebounceTimer);
      }
      
      mutationDebounceTimer = setTimeout(() => {
        debugLog('🌲 Navigator tree changed, re-scanning...');
        addToggleButtonsToNavigator({ force: true, reason: 'navigator mutation' });
      }, 100);
    }
  });
  
  window._navigatorObserver.observe(navigatorPanel, {
    childList: true,
    subtree: true
  });
  
  debugLog('✅ Navigator panel observer active');
}

// Play success sound
function playSuccessSound() {
  try {
    debugLog('🔊 Playing success sound...');
    const soundUrl = chrome.runtime.getURL('assets/sounds/complete.mp3');
    const audio = new Audio(soundUrl);
    audio.volume = 1.0;
    audio.play()
      .then(() => debugLog('✅ Sound playing'))
      .catch(error => console.error('❌ Error playing sound:', error));
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
