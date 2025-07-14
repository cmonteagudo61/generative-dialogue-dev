/**
 * Cover Video Fix - Version 1.0 (2025-04-16)
 * Maximizes video height with padding on sides if needed
 */
(function() {
  console.log("🔧 Cover video fix loaded");
  
  // Fix video display mode and labels
  function applyMaxHeightFix() {
    console.log("🔧 Applying max height video fix...");
    
    // Check if we're in self view
    const selfViewActive = document.querySelector('.navigation-item.active[data-item="self"], .navigation-item.active[data-view="self"]') !== null;
    
    // Fix all videos on the page
    document.querySelectorAll('video').forEach(video => {
      if (selfViewActive) {
        // Self view mode - maximize height
        video.style.objectFit = "cover";
        video.style.objectPosition = "center 20%"; // Focus more on face/shoulders area
        video.style.height = "100%";
        video.style.maxHeight = "100%";
        video.style.width = "100%";
      } else {
        // Other view modes - keep normal cover mode
        video.style.objectFit = "cover";
        video.style.objectPosition = "center";
        video.style.width = "100%";
        video.style.height = "100%";
      }
      
      // Find any labels near this video
      const container = video.closest('.participant-container, .participant');
      if (container) {
        const label = container.querySelector('.participant-name-label, .participant-name');
        if (label) {
          // Fix label positioning to match video exactly
          label.style.position = "absolute";
          label.style.bottom = "0";
          label.style.left = "0";
          label.style.width = "100%";
          label.style.padding = "8px 16px";
          label.style.backgroundColor = "rgba(0,0,0,0.7)";
          label.style.color = "white";
          label.style.boxSizing = "border-box";
          label.style.margin = "0";
          label.style.zIndex = "100";
        }
        
        // Improve container styling
        container.style.position = "relative";
        container.style.overflow = "hidden"; 
      }
    });
  }
  
  // Apply fix now and after any potential view changes
  function setupFixSchedule() {
    // Run immediately
    applyMaxHeightFix();
    
    // Run again after delays to catch dynamic changes
    setTimeout(applyMaxHeightFix, 300);
    setTimeout(applyMaxHeightFix, 1000);
    setTimeout(applyMaxHeightFix, 2000);
    
    // Run on window resize
    window.addEventListener('resize', function() {
      setTimeout(applyMaxHeightFix, 100);
    });
    
    // Watch for navigation changes
    document.addEventListener('click', function(event) {
      if (event.target.classList.contains('navigation-item') || 
          event.target.closest('.navigation-item')) {
        setTimeout(applyMaxHeightFix, 100);
        setTimeout(applyMaxHeightFix, 500);
      }
    });
    
    // Observe DOM changes
    const observer = new MutationObserver(function(mutations) {
      let videoChanged = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          // Check if videos were added
          mutation.addedNodes.forEach(function(node) {
            if (node.nodeName === 'VIDEO' || 
                (node.nodeType === 1 && node.querySelector('video'))) {
              videoChanged = true;
            }
          });
        }
      });
      
      if (videoChanged) {
        setTimeout(applyMaxHeightFix, 100);
      }
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // Start the fix
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFixSchedule);
  } else {
    setupFixSchedule();
  }
})();