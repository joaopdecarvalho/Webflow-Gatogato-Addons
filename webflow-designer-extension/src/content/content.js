// Webflow Designer Extension - Content Script
// Adds toggle buttons to Navigator panel for elements with custom attributes

console.log('🚀 Webflow Designer Extension - Content Script Loaded');

// Configuration
const CONFIG = {
  targetAttribute: 'data-show-in-designer',
  toggleAttribute: 'data-show-in-designer',
  iconHTML: '👁️',
  checkInterval: 2000,
  soundEnabled: true,
  searchTimeLimit: 10000 // Stop searching after 10 seconds
};

// Track initialization time
let initTime = Date.now();
let searchTimedOut = false;
let processedElements = new Set();

// Initialize the extension
async function init() {
  console.log('🔧 Initializing Webflow Designer Extension...');
  console.log('📍 Current URL:', window.location.href);
  console.log('📍 Page title:', document.title);
  
  // Load settings from storage
  const result = await chrome.storage.sync.get(['soundEnabled', 'targetAttribute', 'toggleAttribute']);
  if (result.soundEnabled !== undefined) CONFIG.soundEnabled = result.soundEnabled;
  if (result.targetAttribute) CONFIG.targetAttribute = result.targetAttribute;
  if (result.toggleAttribute) CONFIG.toggleAttribute = result.toggleAttribute;
  
  console.log('💾 Loaded settings from storage:', result);
  console.log('⚙️ Updated CONFIG:', CONFIG);
  
  // Start observing for Navigator panel and elements
  startObserving();
  
  // Initial scan after 2 seconds
  setTimeout(() => {
    console.log('🔍 Running initial scan...');
    addToggleButtonsToNavigator();
  }, 2000);
  
  // Periodic checks for first 10 seconds
  const checkInterval = setInterval(() => {
    if (Date.now() - initTime > CONFIG.searchTimeLimit) {
      clearInterval(checkInterval);
      console.log('⏱️ 10-second search period ended');
    } else {
      addToggleButtonsToNavigator();
    }
  }, CONFIG.checkInterval);
  
  // Listen for messages from popup/background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 Message received:', request);
    
    if (request.action === 'publishSite' || request.action === 'publish-site') {
      window.WebflowAPI.publishSite()
        .then(() => {
          console.log('✅ Publishing completed successfully!');
          
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
      addToggleButtonsToNavigator();
      sendResponse({ success: true });
    }
  });
}

// Expand all tree nodes in the Navigator to reveal nested elements
function expandAllTreeNodes(navigatorPanel) {
  // Expand every few scans to catch newly added elements
  const shouldExpand = !window._lastExpansionTime || 
                      (Date.now() - window._lastExpansionTime > 3000); // Expand every 3 seconds
  
  if (!shouldExpand) {
    return;
  }
  
  console.log('🌳 Expanding all tree nodes to reveal nested elements...');
  window._lastExpansionTime = Date.now();
  
  // First, let's inspect the Navigator structure to understand the tree nodes
  const allButtons = navigatorPanel.querySelectorAll('button');
  console.log(`   📊 Total buttons in Navigator: ${allButtons.length}`);
  
  // Look for buttons with specific attributes or classes
  const ariaExpandedButtons = navigatorPanel.querySelectorAll('[aria-expanded]');
  console.log(`   📊 Buttons with aria-expanded: ${ariaExpandedButtons.length}`);
  
  if (ariaExpandedButtons.length > 0) {
    console.log(`   📋 Sample aria-expanded values:`, 
      Array.from(ariaExpandedButtons).slice(0, 5).map(b => ({
        expanded: b.getAttribute('aria-expanded'),
        classes: b.className,
        tag: b.tagName
      }))
    );
  }
  
  // Find all SVG elements (chevrons are often SVGs)
  const svgs = navigatorPanel.querySelectorAll('svg');
  console.log(`   📊 SVG elements (possible chevrons): ${svgs.length}`);
  
  if (svgs.length > 0) {
    console.log(`   📋 Sample SVG parent classes:`, 
      Array.from(svgs).slice(0, 5).map(svg => ({
        parentTag: svg.parentElement?.tagName,
        parentClass: svg.parentElement?.className,
        ariaExpanded: svg.parentElement?.getAttribute('aria-expanded')
      }))
    );
  }
  
  // Now try to find collapsed nodes
  const expandableElements = navigatorPanel.querySelectorAll('[aria-expanded="false"]');
  console.log(`   🎯 Found ${expandableElements.length} collapsed tree nodes (aria-expanded="false")`);
  
  let expandedCount = 0;
  
  expandableElements.forEach(element => {
    try {
      element.click();
      expandedCount++;
    } catch (e) {
      console.warn('   ⚠️ Failed to click expand button:', e);
    }
  });
  
  console.log(`✅ Expanded ${expandedCount} tree nodes`);
}

// Add toggle buttons to Navigator panel
function addToggleButtonsToNavigator() {
  // Check if search time limit exceeded
  if (searchTimedOut) {
    return;
  }
  
  if (Date.now() - initTime > CONFIG.searchTimeLimit) {
    if (!searchTimedOut) {
      console.log('⏱️ 10-second search limit reached. Stopping element search.');
      searchTimedOut = true;
    }
    return;
  }

  // Find the Navigator panel (left sidebar with elements tree)
  // Look for the actual panel container, not the button
  const navigatorPanel = document.querySelector('[data-panel-id="layers-panel"]') ||
                        document.querySelector('[data-panel-id="navigator-panel"]') ||
                        document.querySelector('div[role="tree"]') ||
                        document.querySelector('[aria-label="Layers"]') ||
                        document.querySelector('[class*="LayersPanel"]') ||
                        document.querySelector('[class*="layers-panel"]');
  
  if (!navigatorPanel) {
    console.log('⚠️ Navigator panel not found. Tried multiple selectors.');
    return; // Navigator not ready yet
  }
  
  // Log what we found (only once)
  if (!window._navigatorPanelLogged) {
    console.log('✅ Found Navigator panel:', navigatorPanel.tagName, navigatorPanel.className);
    console.log('📋 Panel attributes:', Array.from(navigatorPanel.attributes).map(a => `${a.name}="${a.value}"`));
    window._navigatorPanelLogged = true;
  }
  
  // Expand all collapsed tree nodes to make nested elements visible
  expandAllTreeNodes(navigatorPanel);
  
  // Find canvas iframe
  const canvasFrame = document.querySelector('iframe#site-iframe-next') ||
                     document.querySelector('iframe[id*="site-iframe"]');
  
  if (!canvasFrame || !canvasFrame.contentDocument) {
    return; // Canvas not ready yet
  }
  
  const canvasDoc = canvasFrame.contentDocument;
  
  // Find all elements in canvas with our target attribute
  const canvasElements = canvasDoc.querySelectorAll(`[${CONFIG.targetAttribute}]`);
  
  if (canvasElements.length === 0) {
    return;
  }
  
  console.log(`✅ Found ${canvasElements.length} elements with attribute "${CONFIG.targetAttribute}"`);
  console.log(`📋 Element details:`, Array.from(canvasElements).map((el, i) => ({
    index: i + 1,
    tag: el.tagName,
    class: el.className,
    wfId: el.getAttribute('data-wf-id') || el.getAttribute('data-w-id'),
    visible: el.offsetParent !== null
  })));
  
  // Log Navigator panel structure (only once)
  if (!window._navigatorStructureLogged) {
    console.log('📋 Navigator panel structure:', navigatorPanel);
    console.log('📋 Navigator classes:', navigatorPanel.className);
    console.log('📋 Sample Navigator items:', 
      Array.from(navigatorPanel.querySelectorAll('[class*="tree"], [class*="layer"], [class*="node"], div')).slice(0, 5)
    );
    window._navigatorStructureLogged = true;
  }
  
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
          wfId = parsed[0]; // Extract UUID from array
        }
      }
    } catch (e) {
      // If parsing fails, use the raw value
      wfId = wfIdRaw;
    }
    
    console.log(`🔍 Processing canvas element ${index + 1}:`, {
      tag: canvasElement.tagName,
      id: canvasElement.id,
      classes: canvasElement.className,
      wfIdRaw: wfIdRaw,
      wfIdParsed: wfId,
      attributeValue: canvasElement.getAttribute(CONFIG.targetAttribute)
    });
    
    if (!wfId) {
      console.warn(`   ⚠️ Element has no wf-id, skipping`);
      return;
    }
    
    // Find corresponding Navigator item
    console.log(`   🔍 Looking for Navigator item with wf-id: ${wfId}`);
    const navigatorItem = findNavigatorItemByWfId(navigatorPanel, wfId, wfIdRaw, canvasElement);
    
    if (!navigatorItem) {
      console.warn(`   ❌ Navigator item NOT found for wf-id: ${wfId}`);
      return;
    }
    
    console.log(`   ✅ Found Navigator item:`, navigatorItem);
    
    // Check if button already exists on this Navigator item
    if (navigatorItem.querySelector('.wf-ext-toggle-btn')) {
      console.log(`   ⏭️ Button already exists, skipping`);
      return;
    }
    
    // Create unique ID for tracking
    const elementKey = wfId + '-' + CONFIG.targetAttribute;
    
    // Mark as processed
    processedElements.add(elementKey);
    
    // Add button to Navigator item
    addButtonToNavigatorItem(navigatorItem, canvasElement, wfId);
  });
}

// Find Navigator item by Webflow ID
function findNavigatorItemByWfId(navigatorPanel, wfId, wfIdRaw, canvasElement) {
  console.log(`      🔎 Searching for wf-id: "${wfId}" (raw: "${wfIdRaw}")`);
  
  // Log all possible selectors on first call
  if (!window._navigatorSelectorsLogged) {
    const allDivs = navigatorPanel.querySelectorAll('div');
    console.log(`      📊 Total divs in Navigator: ${allDivs.length}`);
    
    const withTreeClass = navigatorPanel.querySelectorAll('[class*="tree"]');
    console.log(`      📊 Divs with "tree" in class: ${withTreeClass.length}`);
    
    const withLayerClass = navigatorPanel.querySelectorAll('[class*="layer"]');
    console.log(`      📊 Divs with "layer" in class: ${withLayerClass.length}`);
    
    const withNodeClass = navigatorPanel.querySelectorAll('[class*="node"]');
    console.log(`      📊 Divs with "node" in class: ${withNodeClass.length}`);
    
    const withTreeRole = navigatorPanel.querySelectorAll('[role="treeitem"]');
    console.log(`      📊 Elements with role="treeitem": ${withTreeRole.length}`);
    
    // Sample some elements and show their text content and structure
    console.log(`      📋 Sample Navigator elements with text:`, Array.from(allDivs).slice(0, 30).map(div => ({
      className: div.className.substring(0, 60),
      textContent: div.textContent ? div.textContent.substring(0, 50) : '',
      dataAttrs: Array.from(div.attributes)
        .filter(a => a.name.startsWith('data-'))
        .map(a => `${a.name}=${a.value.substring(0, 30)}`)
        .join(', ') || 'none'
    })).filter(item => item.textContent.trim().length > 0 && item.textContent.length < 100));
    
    // Look for elements that might contain element names
    const possibleNameElements = navigatorPanel.querySelectorAll('[class*="name"], [class*="label"], [class*="text"], span, p');
    console.log(`      📋 Elements that might show names: ${possibleNameElements.length}`);
    if (possibleNameElements.length > 0) {
      console.log(`      📋 Sample name elements:`, Array.from(possibleNameElements).slice(0, 10).map(el => ({
        tag: el.tagName,
        className: el.className.substring(0, 50),
        text: el.textContent.trim().substring(0, 40)
      })).filter(item => item.text.length > 0 && item.text.length < 50));
    }
    
    window._navigatorSelectorsLogged = true;
  }
  
  // Try different selection strategies
  // Strategy 1: Direct attribute match with parsed ID
  let item = navigatorPanel.querySelector(`[data-wf-id="${wfId}"]`) ||
             navigatorPanel.querySelector(`[data-w-id="${wfId}"]`) ||
             navigatorPanel.querySelector(`[data-node-id="${wfId}"]`);
  
  if (item) {
    console.log(`      ✅ Found by parsed ID!`);
    return item;
  }
  
  // Strategy 2: Try with raw ID (JSON format)
  if (wfIdRaw && wfIdRaw !== wfId) {
    item = navigatorPanel.querySelector(`[data-wf-id='${wfIdRaw}']`) ||
           navigatorPanel.querySelector(`[data-w-id='${wfIdRaw}']`);
    
    if (item) {
      console.log(`      ✅ Found by raw ID!`);
      return item;
    }
  }
  
  // Strategy 3: Search ALL elements in the Navigator by class name
  const elementClasses = canvasElement.className.split(' ').filter(c => c.length > 0);
  const elementTag = canvasElement.tagName.toLowerCase();
  
  console.log(`      🔎 Trying to find by tag "${elementTag}" and classes:`, elementClasses);
  
  // Strategy 3A: Search through ALL divs and spans in the Navigator
  // This ensures we find nested/hidden elements too
  const allElements = navigatorPanel.querySelectorAll('div, span');
  console.log(`      🔎 Searching through ${allElements.length} Navigator elements...`);
  
  let matchesFound = 0;
  
  for (const el of allElements) {
    // Skip if already has button
    if (el.querySelector('.wf-ext-toggle-btn')) {
      continue;
    }
    
    // Get the direct text content (not from children)
    let directText = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        directText += node.textContent.trim();
      }
    }
    
    if (!directText || directText.length > 100) continue;
    
    const directTextLower = directText.toLowerCase();
    
    // Check if this text exactly matches one of our class names
    for (const className of elementClasses) {
      if (directText === className || 
          directTextLower === className.toLowerCase() ||
          (directText.length < 30 && directTextLower.includes(className.toLowerCase()))) {
        
        matchesFound++;
        
        // Find the tree item container (parent with tree/item/row in class)
        const treeItem = el.closest('[class*="tree"], [class*="item"], [class*="row"], [class*="node"], [class*="layer"]');
        
        if (treeItem) {
          // Double-check this tree item doesn't have a button
          if (!treeItem.querySelector('.wf-ext-toggle-btn')) {
            console.log(`      ✅ Found match #${matchesFound}! Class: "${className}", Text: "${directText}"`);
            return treeItem;
          } else {
            console.log(`      ⏭️ Match found but already has button (${directText})`);
          }
        } else {
          // If no tree item parent, use the element itself
          console.log(`      ✅ Found match (no tree parent)! Class: "${className}", Text: "${directText}"`);
          return el;
        }
      }
    }
  }
  
  console.log(`      ❌ No Navigator match found after checking ${allElements.length} elements. Matches considered: ${matchesFound}`);
  
  console.log(`      ❌ No match found in Navigator`);
  return null;
}

// Add toggle button to Navigator item
function addButtonToNavigatorItem(navigatorItem, canvasElement, wfId) {
  // Check if button already exists
  if (navigatorItem.querySelector('.wf-ext-toggle-btn')) {
    return;
  }
  
  console.log(`➕ Adding button for element with wf-id: ${wfId}`);
  
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
    
    console.log('🖱️ Toggle button clicked for wf-id:', wfId);
    
    // Toggle the attribute
    const currentValue = canvasElement.getAttribute(CONFIG.toggleAttribute);
    const newValue = currentValue === 'true' ? 'false' : 'true';
    
    canvasElement.setAttribute(CONFIG.toggleAttribute, newValue);
    console.log(`✅ Toggled ${CONFIG.toggleAttribute}: ${currentValue} → ${newValue}`);
    
    // Update button appearance
    updateButtonState(button, canvasElement);
  });
  
  // Insert button into Navigator item
  // Try to append next to the element name
  const nameElement = navigatorItem.querySelector('[class*="name"]') ||
                     navigatorItem.querySelector('[class*="label"]') ||
                     navigatorItem.querySelector('span');
  
  if (nameElement) {
    nameElement.appendChild(button);
  } else {
    navigatorItem.appendChild(button);
  }
  
  console.log('✅ Button added to Navigator item');
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
    // Only check if not timed out
    if (!searchTimedOut) {
      // Check if Navigator or canvas changed
      const hasRelevantChanges = mutations.some(mutation => 
        mutation.addedNodes.length > 0 || 
        mutation.removedNodes.length > 0
      );
      
      if (hasRelevantChanges) {
        addToggleButtonsToNavigator();
      }
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('👀 Started DOM observer');
}

// Play success sound when publishing completes
function playSuccessSound() {
  try {
    console.log('🔊 Playing success sound...');
    const soundUrl = chrome.runtime.getURL('assets/sounds/complete.mp3');
    
    // Create a completely fresh audio instance
    const audio = new Audio(soundUrl);
    
    // Set properties before any other operations
    audio.currentTime = 0;
    audio.volume = 1.0;
    audio.playbackRate = 1.0; // Ensure normal speed
    
    // Add event listener to verify it starts from beginning
    audio.addEventListener('loadedmetadata', () => {
      console.log('🎵 Audio metadata loaded, duration:', audio.duration, 'seconds');
      audio.currentTime = 0; // Reset again after metadata loads
    });
    
    // Play
    audio.play()
      .then(() => {
        console.log('✅ Sound playing from time:', audio.currentTime);
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
