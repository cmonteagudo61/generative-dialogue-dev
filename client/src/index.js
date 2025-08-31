import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import App from './App';

// Aggressive webpack overlay blocking to prevent flashing
if (process.env.NODE_ENV === 'development') {
  console.log('🛡️ Initializing webpack overlay blocking...');
  
  // Method 1: Override createElement
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName, options) {
    const element = originalCreateElement.call(this, tagName, options);
    
    // Block any iframe creation that might be webpack overlay
    if (tagName.toLowerCase() === 'iframe') {
      // Set up a watcher for when id gets set
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'id' && value && value.includes('webpack-dev-server-client-overlay')) {
          console.log('🚫 Blocked webpack overlay iframe via setAttribute');
          return; // Don't set the id
        }
        return originalSetAttribute.call(this, name, value);
      };
      
      // Also watch for direct id assignment
      Object.defineProperty(element, 'id', {
        set: function(value) {
          if (value && value.includes('webpack-dev-server-client-overlay')) {
            console.log('🚫 Blocked webpack overlay iframe via id property');
            return;
          }
          this.setAttribute('id', value);
        },
        get: function() {
          return this.getAttribute('id');
        }
      });
    }
    
    return element;
  };
  
  // Method 2: Override appendChild to catch when overlays are added
  const originalAppendChild = Node.prototype.appendChild;
  Node.prototype.appendChild = function(child) {
    // Block ALL iframes being added to body (aggressive approach)
    if (child && child.tagName === 'IFRAME' && this === document.body) {
      console.log('🚫 Blocked ALL iframe appendChild to body (likely webpack overlay)');
      return child; // Return the child but don't actually append it
    }
    return originalAppendChild.call(this, child);
  };
  
  // Method 3: Mutation observer to catch and remove any that slip through
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.target === document.body) {
        mutation.addedNodes.forEach((node) => {
          // Remove ALL iframes added to body (aggressive approach)
          if (node.tagName === 'IFRAME') {
            console.log('🗑️ Mutation observer removing iframe from body (likely webpack overlay)');
            node.remove();
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Method 4: Periodic cleanup - remove ALL iframes from body
  const removeOverlays = () => {
    const allIframes = document.body.querySelectorAll('iframe');
    if (allIframes.length > 0) {
      console.log(`🧹 Periodic cleanup removing ${allIframes.length} iframes from body`);
      allIframes.forEach(iframe => iframe.remove());
    }
  };
  
  setInterval(removeOverlays, 500); // Check every 500ms
  
  // Method 5: Disable webpack client entirely if possible
  if (window.__webpack_dev_server_client__) {
    console.log('🚫 Disabling webpack dev server client');
    window.__webpack_dev_server_client__ = null;
  }
}
// Debug logger disabled
// import DebugLogger from './utils/debugLogger';

// Initialize debug logger and override console logs
// if (process.env.NODE_ENV === 'development') {
//   console.log('Debug mode enabled');
//   // Override console methods to also display in UI logger
//   DebugLogger.overrideConsole();
//   window.debugLogger = DebugLogger;
// }

const root = createRoot(document.getElementById('root'));
// Remove StrictMode for production to prevent duplicate API calls
root.render(<App />);

