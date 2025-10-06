// Webflow API utility functions

console.log('📚 Webflow API utility loaded');

/**
 * Triggers the publish action in Webflow Designer
 * Instead of using the API directly, we'll interact with the Webflow Designer UI
 */
const WebflowAPI = {
  /**
   * Publishes the site by clicking the publish button in Webflow Designer
   */
  publishSite: async function() {
    console.log('🚀 WebflowAPI.publishSite() called');
    
    return new Promise((resolve, reject) => {
      try {
        // Find and click the publish button in Webflow Designer
        // The selector may need to be updated based on Webflow's current UI
        console.log('🔍 Step 1: Looking for main publish button...');
        
        const publishButton = document.querySelector('[data-automation-id="navbar-publish-button"]') ||
                            document.querySelector('[aria-label="Publish"]') ||
                            document.querySelector('[aria-label*="Publish"]') ||
                            findButtonByText('Publish');
        
        if (publishButton) {
          console.log('✅ Main publish button found:', publishButton);
          publishButton.click();
          console.log('🖱️ Main publish button clicked - modal should open');
          
          // Wait for modal to open and then click the staging publish button
          this.clickStagingPublishButton()
            .then(() => {
              console.log('✅ Staging publish initiated');
              // Wait for publish to complete
              return this.waitForPublishCompletion();
            })
            .then(() => {
              console.log('✅ Publish completed successfully');
              resolve({ success: true, message: 'Site published successfully' });
            })
            .catch(reject);
        } else {
          console.error('❌ Publish button not found');
          console.log('📋 Available buttons on page:', document.querySelectorAll('button'));
          reject(new Error('Publish button not found'));
        }
      } catch (error) {
        console.error('❌ Error in publishSite:', error);
        reject(error);
      }
    });
  },

  /**
   * Clicks the "Publish to selected domains" button inside the publish modal
   */
  clickStagingPublishButton: function() {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 20; // 10 seconds max wait
      
      console.log('🔍 Step 2: Waiting for publish modal to open...');
      
      const checkInterval = setInterval(() => {
        attempts++;
        
        // Look for the "Publish to selected domains" button inside the modal
        // Try multiple selectors as Webflow UI may vary
        const publishButton = 
          // Try by exact text content first
          findButtonByText('Publish to selected domains') ||
          findButtonByText('Publish to Selected Domains') ||
          // Try partial matches
          Array.from(document.querySelectorAll('[role="dialog"] button, [data-modal] button, .modal button')).find(btn => 
            btn.textContent.toLowerCase().includes('publish to selected') ||
            btn.textContent.toLowerCase().includes('selected domains')
          ) ||
          // Try automation IDs
          document.querySelector('[data-automation-id="publish-to-selected-domains"]') ||
          document.querySelector('[data-automation-id*="selected-domains"]') ||
          // Try any primary/submit button in modal with "publish" text
          Array.from(document.querySelectorAll('[role="dialog"] button[type="submit"], [role="dialog"] button.primary, .modal button[type="submit"]')).find(btn => 
            btn.textContent.toLowerCase().includes('publish')
          ) ||
          // Fallback: any button with "publish" in a modal (but not cancel)
          Array.from(document.querySelectorAll('[role="dialog"] button')).find(btn => 
            btn.textContent.toLowerCase().includes('publish') && 
            !btn.textContent.toLowerCase().includes('cancel')
          );
        
        if (publishButton) {
          clearInterval(checkInterval);
          console.log('✅ "Publish to selected domains" button found:', publishButton);
          console.log('   - Button text:', publishButton.textContent);
          console.log('   - Button attributes:', publishButton.attributes);
          
          // Click the publish button
          publishButton.click();
          console.log('🖱️ "Publish to selected domains" button clicked!');
          
          // Wait a bit for the click to register
          setTimeout(() => resolve(), 500);
          return;
        }
        
        if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          console.error('❌ Timeout: Could not find "Publish to selected domains" button');
          console.log('📋 Available buttons in modals:', 
            document.querySelectorAll('[role="dialog"] button, [data-modal] button, .modal button')
          );
          console.log('📋 All modal text content:', 
            Array.from(document.querySelectorAll('[role="dialog"], [data-modal], .modal')).map(m => m.textContent)
          );
          reject(new Error('"Publish to selected domains" button not found in modal'));
        }
      }, 500);
    });
  },

  /**
   * Waits for the publish operation to complete
   */
  waitForPublishCompletion: function() {
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const maxChecks = 600; // 60 seconds timeout (checking every 100ms)
      let publishDetected = false;
      
      console.log('⏳ Waiting for publish to complete...');
      console.log('   Looking for "Published" text on publish button...');
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // Look for the main publish button showing "Published" text
        const publishButton = document.querySelector('[data-automation-id="navbar-publish-button"]') ||
                             document.querySelector('[aria-label="Publish"]') ||
                             document.querySelector('[aria-label*="Publish"]') ||
                             findButtonByText('Publish');
        
        if (publishButton) {
          const buttonText = publishButton.textContent.trim().toLowerCase();
          
          // Check if button says "Published" or "Published successfully"
          if ((buttonText.includes('published') && !buttonText.includes('publish to')) || 
              buttonText === 'published') {
            
            if (!publishDetected) {
              publishDetected = true;
              console.log('✅ Publish button shows "Published" - publish complete!');
              console.log('   Button text:', publishButton.textContent.trim());
              
              // Immediately resolve to trigger sound
              clearInterval(checkInterval);
              console.log('✅ Publish completed successfully!');
              
              // Close modal after a short delay (sound will play first)
              setTimeout(() => {
                console.log('🚪 Closing publish modal...');
                publishButton.click();
              }, 200);
              
              resolve();
            }
          }
        }
        
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          console.warn('⚠️ Publish timeout reached');
          const btn = document.querySelector('[data-automation-id="navbar-publish-button"]');
          console.log('📋 Publish button text at timeout:', btn?.textContent.trim());
          reject(new Error('Publish timeout'));
        } else if (checkCount % 20 === 0 && !publishDetected) {
          console.log(`⏳ Still waiting... (${checkCount * 0.1}s)`);
        }
      }, 100); // Check every 100ms
    });
  },

  /**
   * Closes the publish modal after publishing
   */
  closePublishModal: function() {
    console.log('🚪 Attempting to close publish modal...');
    
    // Try multiple methods to close the modal
    
    // Method 1: Click the close/X button
    const closeButton = document.querySelector('[role="dialog"] button[aria-label="Close"]') ||
                       document.querySelector('[role="dialog"] [aria-label="close"]') ||
                       document.querySelector('[role="dialog"] .close-button') ||
                       document.querySelector('[data-modal] button[aria-label="Close"]');
    
    if (closeButton) {
      console.log('✅ Found close button, clicking...');
      closeButton.click();
      return;
    }
    
    // Method 2: Press Escape key
    console.log('⌨️ Pressing Escape key to close modal...');
    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      code: 'Escape',
      keyCode: 27,
      which: 27,
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(escapeEvent);
    
    // Method 3: Click the backdrop/overlay if it exists
    setTimeout(() => {
      const backdrop = document.querySelector('[role="dialog"]')?.parentElement;
      if (backdrop && backdrop.classList.contains('modal-backdrop', 'overlay', 'backdrop')) {
        console.log('🎭 Clicking modal backdrop...');
        backdrop.click();
      }
    }, 100);
  },

  /**
   * Checks if an element has a specific attribute or property
   */
  hasTargetAttribute: function(element, attributeName, attributeValue = null) {
    if (!element || !attributeName) return false;
    
    const hasAttr = element.hasAttribute(attributeName);
    
    if (!hasAttr) return false;
    if (attributeValue === null) return true;
    
    return element.getAttribute(attributeName) === attributeValue;
  },

  /**
   * Toggles a custom attribute on an element
   */
  toggleCustomAttribute: function(element, attributeName, valueOn = 'true', valueOff = 'false') {
    console.log('🔄 toggleCustomAttribute called');
    console.log('   - Element:', element);
    console.log('   - Attribute:', attributeName);
    console.log('   - ValueOn:', valueOn);
    console.log('   - ValueOff:', valueOff);
    
    if (!element || !attributeName) {
      console.error('❌ Invalid element or attribute name');
      return;
    }
    
    const currentValue = element.getAttribute(attributeName);
    console.log('   - Current value:', currentValue);
    
    if (currentValue === valueOn) {
      element.setAttribute(attributeName, valueOff);
      console.log(`   ✅ Toggled to: ${valueOff}`);
    } else {
      element.setAttribute(attributeName, valueOn);
      console.log(`   ✅ Toggled to: ${valueOn}`);
    }
    
    // Trigger a custom event for attribute change
    element.dispatchEvent(new CustomEvent('attribute-toggled', {
      detail: { attributeName, newValue: element.getAttribute(attributeName) }
    }));
    
    console.log('   🎉 Custom event dispatched');
  }
};

/**
 * Helper function to find button by text content
 */
function findButtonByText(text) {
  const buttons = document.querySelectorAll('button');
  for (let button of buttons) {
    if (button.textContent.trim().toLowerCase().includes(text.toLowerCase())) {
      return button;
    }
  }
  return null;
}

// Make WebflowAPI available globally for the content script
if (typeof window !== 'undefined') {
  window.WebflowAPI = WebflowAPI;
  console.log('✅ WebflowAPI attached to window object');
  console.log('📋 Available methods:', Object.keys(WebflowAPI));
}