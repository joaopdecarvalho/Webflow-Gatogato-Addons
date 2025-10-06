// Webflow API utility functions

/**
 * Triggers the publish action in Webflow Designer
 * Instead of using the API directly, we'll interact with the Webflow Designer UI
 */
const WebflowAPI = {
  /**
   * Publishes the site by clicking the publish button in Webflow Designer
   */
  publishSite: async function() {
    return new Promise((resolve, reject) => {
      try {
        // Find and click the publish button in Webflow Designer
        // The selector may need to be updated based on Webflow's current UI
        const publishButton = document.querySelector('[data-automation-id="navbar-publish-button"]') ||
                            document.querySelector('[aria-label="Publish"]') ||
                            document.querySelector('button:has-text("Publish")') ||
                            findButtonByText('Publish');
        
        if (publishButton) {
          publishButton.click();
          
          // Wait for publish to complete by monitoring the UI
          this.waitForPublishCompletion()
            .then(() => resolve({ success: true, message: 'Site published successfully' }))
            .catch(reject);
        } else {
          reject(new Error('Publish button not found'));
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Waits for the publish operation to complete
   */
  waitForPublishCompletion: function() {
    return new Promise((resolve, reject) => {
      let checkCount = 0;
      const maxChecks = 60; // 60 seconds timeout
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        // Look for success indicators in the UI
        const successIndicator = document.querySelector('[data-automation-id="publish-success"]') ||
                                document.querySelector('.publish-success') ||
                                document.querySelector('[aria-label*="published"]');
        
        // Check if publish modal is closed (publish completed)
        const publishModal = document.querySelector('[data-automation-id="publish-modal"]');
        
        if (successIndicator || (!publishModal && checkCount > 2)) {
          clearInterval(checkInterval);
          resolve();
        } else if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          reject(new Error('Publish timeout'));
        }
      }, 1000);
    });
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
    if (!element || !attributeName) return;
    
    const currentValue = element.getAttribute(attributeName);
    
    if (currentValue === valueOn) {
      element.setAttribute(attributeName, valueOff);
    } else {
      element.setAttribute(attributeName, valueOn);
    }
    
    // Trigger a custom event for attribute change
    element.dispatchEvent(new CustomEvent('attribute-toggled', {
      detail: { attributeName, newValue: element.getAttribute(attributeName) }
    }));
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
}