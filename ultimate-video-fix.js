/**
 * ULTIMATE Video Fix - Version 1.0
 * Updated: 2025-04-26
 * 
 * Complete replacement of video handling for quad and kiva views
 */
(function() {
  console.log("🔨 Applying ULTIMATE video stabilization fix");
  
  // Directly check if the affected function exists
  if (typeof switchGroupSize === 'function') {
    // Store original function reference
    const originalSwitchGroupSize = switchGroupSize;
    
    // Replace with completely custom implementation for quad and kiva
    switchGroupSize = function(size) {
      console.log("⚡ Custom switchGroupSize handler fired for size:", size);
      
      // If not quad or kiva view, use original implementation
      if (size !== '4' && size !== '5') {
        return originalSwitchGroupSize.apply(this, arguments);
      }
      
      console.log("📢 Using custom implementation for quad/kiva view");
      
      // 1. Force all videos to cover immediately
      document.querySelectorAll('video').forEach(video => {
        video.style.objectFit = 'cover';
        video.style.transition = 'none';
        video.style.transform = 'none';
      });
      
      // 2. Update UI for view change (copied from original implementation, but stripped of video switching)
      const previousSize = currentGroupSize;
      currentGroupSize = size;
      
      // Clear views
      document.querySelectorAll('.participants-grid').forEach(grid => {
        grid.style.display = 'none';
      });
      
      // Show appropriate view
      const viewToShow = document.querySelector(`.participants-grid.${size === '4' ? 'quad' : 'kiva'}-view`);
      if (viewToShow) {
        viewToShow.style.display = 'grid';
      }
      
      // Update navigation
      document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
      });
      document.querySelector(`.nav-item[data-item="${size}"]`)?.classList.add('active');
      
      // Immediately apply direct fixes to all videos again
      document.querySelectorAll('video').forEach(video => {
        video.style.objectFit = 'cover';
        video.style.transition = 'none';
        video.style.transform = 'none';
      });
      
      // Apply delayed fixes for any async changes
      setTimeout(() => {
        document.querySelectorAll('video').forEach(video => {
          video.style.objectFit = 'cover';
          video.style.transition = 'none';
          video.style.transform = 'none';
        });
      }, 100);
      
      return true; // Indicate success
    };
  } else {
    console.log("❌ Could not find switchGroupSize function");
  }
  
  // Add a global CSS rule to lock all videos
  const style = document.createElement('style');
  style.textContent = `
    /* Force all videos to maintain consistent appearance in quad/kiva views ONLY */
    .participants-grid.quad-view video,
    .participants-grid.kiva-view video,
    .participants-grid[data-group-size="4"] video,
    .participants-grid[data-group-size="5"] video {
      object-fit: cover !important;
      transform: none !important;
      transition: none !important;
      animation: none !important;
    }
    
    /* Specifically target video overlays */
    .quad-view .video-overlay video,
    .kiva-view .video-overlay video,
    .participants-grid[data-group-size="4"] .video-overlay video,
    .participants-grid[data-group-size="5"] .video-overlay video,
    .quad-view #local-video-overlay video,
    .kiva-view #local-video-overlay video {
      object-fit: cover !important;
      transform: none !important;
      transition: none !important;
      animation: none !important;
    }
  `;
  document.head.appendChild(style);
  
  // Monitor for changes and maintain video style
  const observer = new MutationObserver(mutations => {
    // Only in quad or kiva view
    if (document.querySelector('.quad-view') || document.querySelector('.kiva-view')) {
      // Force videos to maintain appearance
      document.querySelectorAll('video').forEach(video => {
        video.style.objectFit = 'cover';
        video.style.transform = 'none';
      });
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style']
  });
})();