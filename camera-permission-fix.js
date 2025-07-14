/**
 * Camera Permission Fix for Daily.co
 * Version 1.0 (2025-04-18)
 */
(function() {
  console.log("🔧 Daily.co Camera Permission Fix loaded");

  // Find and auto-click any buttons that might be blocking access
  function autoClickPermissionButtons() {
    // Look for buttons matching join or setup patterns
    const buttonSelectors = [
      'button[aria-label="Join"]',
      'button.join-button',
      '[data-testid="join-button"]',
      'button.join',
      'button[class*="join"]',
      'button[aria-label="Go to setup"]',
      'button[aria-label="Start"]',
      'button[class*="setup"]',
      'button[class*="grant"]',
      'button[class*="allow"]',
      'button[class*="permission"]'
    ];

    // Create selector string
    const combinedSelector = buttonSelectors.join(', ');
    
    // Find all buttons in document
    const buttons = document.querySelectorAll(combinedSelector);
    
    if (buttons.length > 0) {
      console.log(`Found ${buttons.length} permission/join buttons - clicking them`);
      buttons.forEach(button => {
        try {
          button.click();
          console.log("Clicked button:", button.textContent || button.getAttribute("aria-label"));
        } catch (e) {
          console.warn("Error clicking button:", e);
        }
      });
    }
    
    // Also check inside all iframes
    try {
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach(iframe => {
        try {
          if (iframe.contentWindow && iframe.contentWindow.document) {
            const iframeButtons = iframe.contentWindow.document.querySelectorAll(combinedSelector);
            if (iframeButtons.length > 0) {
              console.log(`Found ${iframeButtons.length} buttons in iframe - clicking`);
              iframeButtons.forEach(btn => btn.click());
            }
          }
        } catch (e) {
          // Cross-origin restrictions will typically prevent this
        }
      });
    } catch (e) {
      console.warn("Error accessing iframes:", e);
    }
  }

  // Pre-authorize camera and microphone
  function preAuthorizeCameraAndMic() {
    console.log("Pre-authorizing camera and microphone access...");
    
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(stream => {
          console.log("✅ Successfully pre-authorized camera and microphone");
          
          // Optional: Display the video briefly to show user it's working
          const tempVideo = document.createElement('video');
          tempVideo.srcObject = stream;
          tempVideo.autoplay = true;
          tempVideo.style.position = 'fixed';
          tempVideo.style.right = '0';
          tempVideo.style.bottom = '0';
          tempVideo.style.width = '1px';
          tempVideo.style.height = '1px';
          tempVideo.style.opacity = '0.01';
          document.body.appendChild(tempVideo);
          
          // After a moment, clean up
          setTimeout(() => {
            // Stop all tracks
            stream.getTracks().forEach(track => track.stop());
            // Remove the video element
            tempVideo.remove();
            
            // Now automatically click any permission buttons that might appear
            autoClickPermissionButtons();
          }, 1000);
        })
        .catch(err => {
          console.error("❌ Could not pre-authorize media devices:", err);
          
          // If this fails, still try clicking buttons
          autoClickPermissionButtons();
          
          // Add a special message to help the user
          const container = document.createElement('div');
          container.style.position = 'fixed';
          container.style.top = '10px';
          container.style.left = '50%';
          container.style.transform = 'translateX(-50%)';
          container.style.backgroundColor = 'rgba(255, 100, 0, 0.9)';
          container.style.color = 'white';
          container.style.padding = '10px 20px';
          container.style.borderRadius = '5px';
          container.style.zIndex = '9999';
          container.style.fontSize = '14px';
          container.style.maxWidth = '90%';
          container.style.textAlign = 'center';
          container.innerHTML = `
            <p><strong>Camera access is required</strong></p>
            <p>Please click "Allow" when your browser asks for camera permission.</p>
            <p>If you don't see a prompt, check for camera icon in your browser's address bar.</p>
          `;
          document.body.appendChild(container);
          
          // Remove after 15 seconds
          setTimeout(() => container.remove(), 15000);
        });
    } else {
      console.error("❌ getUserMedia not supported in this browser");
      autoClickPermissionButtons();
    }
  }

  // Set up continuous scanning and clicking
  function setupContinuousScanning() {
    // Initial click immediately
    autoClickPermissionButtons();
    
    // Then set up an interval to check repeatedly
    const intervalId = setInterval(autoClickPermissionButtons, 500);
    
    // Stop after 30 seconds (60 attempts)
    setTimeout(() => {
      clearInterval(intervalId);
      console.log("Stopped automatic button clicking after 30 seconds");
    }, 30000);
    
    // Setup a MutationObserver to watch for new buttons
    if (window.MutationObserver) {
      const observer = new MutationObserver(() => {
        autoClickPermissionButtons();
      });
      
      // Start observing the document
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
      
      // Disconnect after 30 seconds
      setTimeout(() => {
        observer.disconnect();
      }, 30000);
    }
  }

  // Add CSS to hide the Camera Setup Required dialog
  function addHidingCSS() {
    const style = document.createElement('style');
    style.textContent = `
      /* Hide the Camera Setup dialog */
      div[class*="prejoin-container"],
      div[class*="prejoin"],
      div[class*="setup-container"],
      div[class*="setup-dialog"],
      div[class*="permission-dialog"],
      div[class*="camera-permission"],
      button[aria-label="Go to setup"],
      button[data-testid="setup-button"] {
        display: none !important;
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
      
      /* Make videos visible */
      video {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
    `;
    document.head.appendChild(style);
  }

  // Main initialization function
  function initialize() {
    console.log("Initializing Daily.co camera permission fix");
    
    // First add the hiding CSS
    addHidingCSS();
    
    // Then preauthorize camera/mic
    preAuthorizeCameraAndMic();
    
    // Setup continuous scanning in parallel
    setupContinuousScanning();
    
    // Get the Daily.co frame if it exists
    const dailyFrame = document.querySelector('iframe[allow*="camera"]');
    if (dailyFrame) {
      console.log("Found existing Daily.co iframe - applying fixes directly");
      
      // Try to access the iframe
      try {
        if (dailyFrame.contentWindow && dailyFrame.contentWindow.document) {
          // Add our hiding CSS to the iframe
          const frameStyle = document.createElement('style');
          frameStyle.textContent = `
            /* Hide setup dialogs */
            div[class*="prejoin"],
            div[class*="setup"],
            div[class*="permission"],
            button[aria-label="Go to setup"],
            button[data-testid="setup-button"] {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
            }
          `;
          dailyFrame.contentWindow.document.head.appendChild(frameStyle);
          
          // Click any buttons inside
          autoClickPermissionButtons();
        }
      } catch (e) {
        // Cross-origin access will typically fail
        console.log("Could not access iframe content directly due to cross-origin restrictions");
      }
    }
  }

  // Run the initialization when the page is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
  
  // Re-run after a delay to catch any late-loading elements
  setTimeout(initialize, 1000);
  setTimeout(initialize, 2000);
})();