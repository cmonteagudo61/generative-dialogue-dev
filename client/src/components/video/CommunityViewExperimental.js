import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MicrophoneOff,
  CameraOff,
  DefaultGrey
} from '../../assets/icons';
import './CommunityViewExperimental.css';

// Constants moved to inside component to avoid duplication

// Helper to generate a deterministic "random" avatar based on index - ONLY human photos from randomuser.me
const randomAvatar = (i) => {
  const baseUrl = 'https://randomuser.me/api/portraits/';
  const type = ['men', 'women'][i % 2];
  const id = (i % 50) + 1;
  return `${baseUrl}${type}/${id}.jpg`;
};

// Helper to get grid config for each view mode
function getGridConfig(viewMode, count) {
  switch (viewMode) {
    case 'self':
    case 'individual':
      return { rows: 1, cols: 1 };
    case 'dyad':
      return { rows: 1, cols: 2 };
    case 'triad':
      return { rows: 1, cols: 3 };
    case 'quad':
      return { rows: 2, cols: 2 };
    case 'kiva':
      return { rows: 2, cols: 3 };
    case 'community': {
      // For community, try to fill as square as possible
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      return { rows, cols };
    }
    default: {
      // Fallback: try to fill as square as possible
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      return { rows, cols };
    }
  }
}

const CommunityViewExperimental = ({ 
  participants = [], 
  viewMode = 'community', 
  showLabels = false,
  centerMousePosition = null,
  scrollPosition = { x: 0, y: 0 },
  isMagnifierActive = false,
  magnifierSize = 200,
  forceUpdate = 0,
  onCenterParticipantChange = null,
  onParticipantArrayReady = null // NEW: Callback to send participant array to magnifier
}) => {
  // State declarations must come first
  const gridRef = useRef(null);
  const scrollWrapperRef = useRef(null);
  const [gridStyle, setGridStyle] = useState({});
  const [debugInfo, setDebugInfo] = useState({});
  const [mockParticipantCount, setMockParticipantCount] = useState(300);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // Debug logging for centerMousePosition
  useEffect(() => {
    console.log('🔍 CommunityViewExperimental centerMousePosition changed:', {
      centerMousePosition,
      isActive: !!centerMousePosition,
      position: centerMousePosition ? { x: centerMousePosition.x, y: centerMousePosition.y } : null
    });
  }, [centerMousePosition]);

  // Constants
  const MIN_SIZE = 60;
  const MAX_SIZE = 200;
  const SPACING = 8;

  // Accept both array and object
  const realParticipants = Array.isArray(participants)
    ? participants
    : Object.values(participants);

  // Generate mock participants for testing (ensure we have enough to test)
  const generateMockParticipants = (count) => {
    return Array.from({ length: count }, (_, i) => {
      // Test long names for first 3 participants
      let userName;
      if (i === 0) {
        userName = "Dr. Alexandra Thompson-Williams";
      } else if (i === 1) {
        userName = "Professor Christopher Montgomery-Smith III";
      } else if (i === 2) {
        userName = "Maria Elena Rodriguez-Gonzalez de la Cruz";
      } else {
        userName = `User ${realParticipants.length + i + 1}`;
      }
      
      return {
        session_id: `mock-${Date.now()}-${i}`,
        user_name: userName,
        local: false,
        tracks: { 
          // Use deterministic values based on index instead of Math.random()
          video: { state: (i % 10) > 2 ? 'playable' : 'blocked' }, // ~70% have video
          audio: { state: (i % 5) > 0 ? 'playable' : 'blocked' }   // ~80% have audio
        },
        avatar: randomAvatar(i) // Use the deterministic avatar function
      };
    });
  };

  // FIXED: Properly memoize participantArray to prevent infinite re-renders
  const participantArray = useMemo(() => {
    const realParticipants = participants.map((p, index) => ({
      ...p,
      session_id: p.session_id || `real-${index}`,
      identity: p.identity || `User ${index + 1}`,
      type: 'real'
    }));

    // For demo/testing: add mock participants based on controlled count
    const mockCount = Math.max(0, mockParticipantCount - realParticipants.length);
    const mockParticipants = generateMockParticipants(mockCount);
    
    return [...realParticipants, ...mockParticipants];
  }, [participants, mockParticipantCount]);

  // Send participant array to magnifier when ready
  useEffect(() => {
    if (onParticipantArrayReady && participantArray.length > 0) {
      onParticipantArrayReady(participantArray, MIN_SIZE);
    }
  }, [participantArray, onParticipantArrayReady]);

  // Force visible range to be set immediately - always show all participants
  useEffect(() => {
    // Always show all participants to match the behavior of the first 12
    setVisibleRange({ start: 0, end: participantArray.length });
    console.log('👁️ Full visible range (virtualization disabled):', {
      start: 0,
      end: participantArray.length,
      totalParticipants: participantArray.length
    });
  }, [participantArray.length, isMagnifierActive]);

  // Calculate visible range based on scroll position
  const updateVisibleRange = useCallback(() => {
    if (!scrollWrapperRef.current || !gridRef.current) return;

    // FIXED: Always show all participants to match first 12 behavior
    // This eliminates the virtualization that was causing hover issues
    setVisibleRange({ start: 0, end: participantArray.length });
    console.log('👁️ Full visible range (virtualization disabled):', {
      start: 0,
      end: participantArray.length,
      totalParticipants: participantArray.length,
      reason: 'disabled_virtualization_for_universal_hover'
    });
  }, [participantArray.length]);

  // Handle scroll events
  useEffect(() => {
    const scrollContainer = scrollWrapperRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      requestAnimationFrame(updateVisibleRange);
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial calculation
    updateVisibleRange();

    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [updateVisibleRange]);

  // Update visible range when magnifier position changes
  useEffect(() => {
    if (centerMousePosition) {
      console.log('🔍 Magnifier activated - forcing full render');
      // Force immediate update of visible range when magnifier becomes active
      updateVisibleRange();
    }
  }, [centerMousePosition, updateVisibleRange]);

  // Grid resize handler with improved responsiveness
  useEffect(() => {
    function handleResize() {
      if (!gridRef.current) return;

      const container = gridRef.current;
      const scrollWrapper = scrollWrapperRef.current;
      
      // Get actual available width from the scroll wrapper (parent container)
      const availableWidth = scrollWrapper ? scrollWrapper.clientWidth : container.offsetWidth;
      const width = Math.max(availableWidth, MIN_SIZE); // Ensure minimum width
      const height = container.offsetHeight || 800;

      // Calculate feeds per row with better width detection
      const feedsPerRow = Math.max(1, Math.floor(width / MIN_SIZE));
      const totalRows = Math.ceil(participantArray.length / feedsPerRow);
      const totalHeight = totalRows * MIN_SIZE;

      console.log('📏 Grid resize (responsive):', {
        availableWidth,
        width,
        height,
        feedsPerRow,
        totalRows,
        totalHeight,
        participantCount: participantArray.length,
        magnifierActive: !!centerMousePosition
      });

      // Update grid style with proper width
      setGridStyle({
        width: '100%', // Use full available width instead of fixed pixels
        height: `${totalHeight}px`,
        position: 'relative',
        backgroundColor: '#000',
        overflow: 'visible'
      });

      // Update debug info
      setDebugInfo({
        gridAreaWidth: width,
        gridAreaHeight: height,
        feedsPerRow,
        totalRows,
        totalHeight,
        participantCount: participantArray.length,
        magnifierActive: !!centerMousePosition
      });

      // Update visible range after resize
      requestAnimationFrame(() => {
        updateVisibleRange();
      });
    }

    // Initial calculation with slight delay to ensure DOM is ready
    const initialTimer = setTimeout(handleResize, 10);

    // Add resize listener with throttling for better performance
    let resizeTimeout;
    const throttledResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 50); // 50ms throttle
    };
    
    window.addEventListener('resize', throttledResize);
    
    // Use ResizeObserver for more accurate container size detection
    let resizeObserver;
    if (scrollWrapperRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
          // Trigger resize when the scroll wrapper size changes
          throttledResize();
        }
      });
      resizeObserver.observe(scrollWrapperRef.current);
    }
    
    // Also listen for changes in participant array
    const participantTimer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', throttledResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      clearTimeout(initialTimer);
      clearTimeout(participantTimer);
      clearTimeout(resizeTimeout);
    };
  }, [participantArray.length, centerMousePosition, updateVisibleRange]);

  // Participant status helper
  const getParticipantIcon = (participant) => {
    const hasAudio = participant.tracks?.audio?.state === 'playable';
    const hasVideo = participant.tracks?.video?.state === 'playable';
    
    if (!hasAudio && !hasVideo) {
      return DefaultGrey;
    } else if (!hasAudio) {
      return MicrophoneOff;
    } else if (!hasVideo) {
      return CameraOff;
    }
    return null;
  };

  const renderParticipants = () => {
    // Simplified coordinate calculation - no complex coordinate system conversions
    const getCenterParticipantIndex = () => {
      if (!centerMousePosition || !gridRef.current) return -1;
      
      const scrollContainer = scrollWrapperRef.current;
      const scrollY = scrollContainer ? scrollContainer.scrollTop : 0;
      
      // Simple coordinate calculation - mouse position + scroll offset
      const mouseXInGrid = centerMousePosition.x;
      const mouseYInGrid = centerMousePosition.y + scrollY;
      
      const feedSize = MIN_SIZE;
      const actualContainerWidth = gridRef.current.offsetWidth;
      const feedsPerRow = Math.floor(actualContainerWidth / feedSize);
      
      if (feedsPerRow <= 0 || feedSize <= 0) return -1;
      
      const colIndex = Math.floor(mouseXInGrid / feedSize);
      const rowIndex = Math.floor(mouseYInGrid / feedSize);
      
      if (colIndex < 0 || colIndex >= feedsPerRow || rowIndex < 0) {
        return -1;
      }
      
      const participantIndex = rowIndex * feedsPerRow + colIndex;
      
      if (participantIndex < 0 || participantIndex >= participantArray.length) {
        return -1;
      }
      
      console.log('🎯 Simplified center calculation:', {
        centerMousePosition,
        mouseXInGrid,
        mouseYInGrid,
        scrollY,
        feedSize,
        feedsPerRow,
        colIndex,
        rowIndex,
        participantIndex
      });
      
      return participantIndex;
    };
    
    const centerParticipantIndex = getCenterParticipantIndex();
    
    // SMART VIRTUALIZATION: Only enable when magnifier is active (to solve scrolling performance)
    // When magnifier is inactive, disable virtualization so all participants render with hover effects
    const shouldVirtualize = isMagnifierActive; // Only virtualize during magnification
    
    const participantsToRender = shouldVirtualize 
      ? participantArray.slice(visibleRange.start, visibleRange.end)
      : participantArray; // Render all participants when not magnifying
    
    const indexOffset = shouldVirtualize ? visibleRange.start : 0;
    
    console.log('🔄 Community View - Smart rendering:', {
      totalParticipants: participantArray.length,
      renderingCount: participantsToRender.length,
      visibleRange,
      indexOffset,
      renderingStrategy: shouldVirtualize ? 'VIRTUALIZED' : 'FULL_RENDER',
      magnifierActive: !!centerMousePosition,
      isMagnifierActive,
      shouldVirtualize,
      renderingIndexes: participantsToRender.map((_, idx) => shouldVirtualize ? (indexOffset + idx) : idx)
    });
    
    let centerParticipantFound = false;
    
    const renderedParticipants = participantsToRender.map((participant, renderIndex) => {
      const i = shouldVirtualize ? (indexOffset + renderIndex) : renderIndex;
      const hasVideo = participant.tracks?.video?.state === 'playable' && participant.tracks?.video?.persistentTrack;
      const displayName = participant.local
        ? (participant.user_name || 'You')
        : (participant.user_name || 'Participant');
      
      // Calculate absolute position for this participant first
      const gridContainer = gridRef.current;
      const actualContainerWidth = gridContainer ? gridContainer.offsetWidth : (debugInfo.gridAreaWidth || 600);
      const feedSize = MIN_SIZE;
      const feedsPerRow = Math.floor(actualContainerWidth / feedSize);
      const col = i % feedsPerRow;
      const row = Math.floor(i / feedsPerRow);
      const x = col * feedSize;
      const y = row * feedSize;
      
      // Simplified center participant detection
      let isCenterParticipant = false;
      if (centerMousePosition && isMagnifierActive) {
        // Simple bounds check - much more reliable
        const scrollContainer = scrollWrapperRef.current;
        const scrollY = scrollContainer ? scrollContainer.scrollTop : 0;
        const mouseXInGrid = centerMousePosition.x;
        const mouseYInGrid = centerMousePosition.y + scrollY;
        
        // Calculate participant bounds
        const particleLeft = x;
        const particleRight = x + feedSize;
        const particleTop = y;
        const particleBottom = y + feedSize;
        
        // Check if mouse is within this participant's bounds
        const isWithinBounds = mouseXInGrid >= particleLeft && 
                              mouseXInGrid <= particleRight && 
                              mouseYInGrid >= particleTop && 
                              mouseYInGrid <= particleBottom;
        
        if (isWithinBounds) {
          isCenterParticipant = true;
          centerParticipantFound = true;
          
          // Notify the magnifier of the center participant name
          if (onCenterParticipantChange) {
            onCenterParticipantChange(displayName);
          }
          
          // Center participant detected (logging reduced to prevent performance issues)
        }
      } else {
        // Simplified fallback - just use the calculated index
        isCenterParticipant = centerMousePosition && i === centerParticipantIndex;
      }
      
      // Center participant positioning (logging reduced for performance)
      
      // Removed excessive logging that was causing infinite loop
      
      return (
        <div
          key={participant.session_id}
          className="experimental-participant"
          tabIndex={0}
          data-participant-index={i}
          data-participant-name={displayName}
          onMouseEnter={(e) => {
            const nameLabel = e.currentTarget.querySelector('.experimental-name-label');
            if (nameLabel) {
              nameLabel.style.opacity = '1';
              nameLabel.style.visibility = 'visible';
              nameLabel.style.display = 'block';
              nameLabel.style.backgroundColor = 'rgba(0,0,0,0.95)';
              nameLabel.style.color = 'white';
            }
          }}
          onMouseLeave={(e) => {
            const nameLabel = e.currentTarget.querySelector('.experimental-name-label');
            if (nameLabel) {
              nameLabel.style.opacity = '0';
              nameLabel.style.visibility = 'hidden';
              nameLabel.style.backgroundColor = 'rgba(0,0,0,0.95)';
              nameLabel.style.color = 'white';
            }
          }}
          style={{ 
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            width: `${feedSize}px`,
            height: `${feedSize}px`,
            backgroundColor: centerMousePosition ? '#444' : '#222',
            overflow: 'visible',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
            border: '1px solid #333'
          }}
        >
          <div 
            className="experimental-participant-inner"
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {hasVideo ? (
              <video
                ref={(el) => {
                  if (el) {
                    const track = participant.tracks?.video?.persistentTrack;
                    if (track) {
                      el.srcObject = new window.MediaStream([track]);
                    }
                    
                    if (typeof ResizeObserver !== 'undefined') {
                      const resizeObserver = new ResizeObserver(entries => {
                        for (let _entry of entries) {
                          if (el) {
                            el.style.width = '100%';
                            el.style.height = '100%';
                            el.style.objectFit = 'cover';
                            el.style.position = 'absolute';
                            el.style.top = '0';
                            el.style.left = '0';
                          }
                        }
                      });
                      
                      const container = el.parentElement;
                      if (container) {
                        resizeObserver.observe(container);
                      }
                      
                      el._resizeObserverCleanup = () => resizeObserver.disconnect();
                    }
                  } else {
                    if (el && el._resizeObserverCleanup) {
                      el._resizeObserverCleanup();
                    }
                  }
                }}
                autoPlay
                playsInline
                muted={participant.local}
                className="experimental-video"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  backgroundColor: '#000',
                  margin: '0',
                  padding: '0',
                  border: 'none'
                }}
              />
            ) : (
              <div 
                className="experimental-img-wrapper"
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  margin: '0',
                  padding: '0'
                }}
              >
                <img
                  src={participant.avatar || randomAvatar(i)}
                  alt={displayName}
                  loading={centerMousePosition ? "eager" : "lazy"}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    backgroundColor: '#333',
                    margin: '0',
                    padding: '0',
                    border: 'none'
                  }}
                  onError={(e) => {
                    console.error(`❌ Image failed to load for participant ${i}:`, e.target.src);
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = 'rgba(0,0,0,0.95)';
                  }}
                  onLoad={() => {
                    if (centerMousePosition) {
                      // Image loaded (logging reduced for performance)
                    }
                  }}
                />
              </div>
            )}
          </div>
          <div 
            className={`experimental-name-label ${isCenterParticipant ? 'center-label' : ''}`}
            style={{
              position: 'absolute',
              bottom: '0px',
              left: '0px',
              background: 'rgba(0,0,0,0.95)',
              color: 'white',
              padding: '4px 12px 4px 6px',
              fontSize: '11px',
              textAlign: 'left',
              whiteSpace: 'nowrap',
              transition: 'opacity 0.2s ease-in-out',
              zIndex: isMagnifierActive ? `${1020 - i}` : 'auto',
              minWidth: 'max-content',
              width: 'max-content',
              maxWidth: '300px',
              boxSizing: 'border-box',
              overflow: 'visible',
              pointerEvents: 'none',
              border: '1px solid #333',
              borderRadius: '0px',
              fontWeight: isCenterParticipant ? 'bold' : 'normal',
              // FIXED: Only set inline opacity/visibility when magnifier is active
              // When magnifier is not active, let CSS hover effects handle visibility
              ...(isMagnifierActive ? {
                opacity: isCenterParticipant ? '1' : '0',
                visibility: isCenterParticipant ? 'visible' : 'hidden'
              } : {})
            }}
          >
            {displayName}
          </div>
          {!participant.session_id.includes('mock') && getParticipantIcon(participant) && (
            <img
              src={getParticipantIcon(participant)}
              alt=""
              className="experimental-status-icon"
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '16px',
                height: '16px',
                backgroundColor: 'rgba(0,0,0,0.7)',
                borderRadius: '2px',
                padding: '2px'
              }}
            />
          )}
        </div>
      );
    });

    // Notify the magnifier of the center participant name at the end of rendering
    if (centerMousePosition && onCenterParticipantChange && !centerParticipantFound) {
      onCenterParticipantChange(''); // Clear the name if no participant is found
    }

    return renderedParticipants;
  };

  return (
    <>
      <style>{`
        .experimental-community-container {
          position: relative !important;
          box-sizing: border-box !important;
          border: none !important;
          margin: 0 !important;
          padding: 0 !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        .experimental-community-container *,
        .experimental-community-container *::before,
        .experimental-community-container *::after {
          box-sizing: border-box !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Hide all background labels when magnifier is active */
        .experimental-community-container[data-magnifier-active="true"] .experimental-name-label {
          opacity: 0 !important;
          visibility: hidden !important;
          display: none !important;
        }
        
        /* Disable hover effects when magnifier is active */
        .experimental-community-container[data-magnifier-active="true"] .experimental-participant:hover .experimental-name-label {
          opacity: 0 !important;
          visibility: hidden !important;
          display: none !important;
        }
        
        /* Ensure magnified content labels are properly styled */
        .magnified-content .experimental-name-label {
          color: white !important;
          background: rgba(0,0,0,0.95) !important;
          border: 1px solid #333 !important;
          border-radius: 0px !important;
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }
        
        /* Force center participant labels to be black in magnified content */
        .magnified-content .experimental-name-label.center-label {
          color: white !important;
          background: rgba(0,0,0,0.95) !important;
          font-weight: bold !important;
          border: 1px solid #333 !important;
          border-radius: 0px !important;
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
        }
        
        .scroll-wrapper {
          width: 100%;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-width: thin;
          scrollbar-color: #666 #333;
          box-sizing: border-box;
        }
        
        .scroll-wrapper::-webkit-scrollbar {
          width: 14px;
        }
        
        .scroll-wrapper::-webkit-scrollbar-track {
          background: #333;
        }
        
        .scroll-wrapper::-webkit-scrollbar-thumb {
          background: #666;
          border-radius: 7px;
          border: 1px solid #444;
        }
        
        .scroll-wrapper::-webkit-scrollbar-thumb:hover {
          background: #888;
        }
        
        .experimental-participant {
          box-sizing: border-box !important;
          overflow: visible !important;
          border: 1px solid #333 !important;
          margin: 0 !important;
          padding: 0 !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        .experimental-participant *,
        .experimental-participant::before,
        .experimental-participant::after {
          margin: 0 !important;
          padding: 0 !important;
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Default state: hide name labels */
        .experimental-name-label {
          opacity: 0;
          visibility: hidden;
          display: block;
          background: rgba(0,0,0,0.95);
          color: white;
          z-index: 99999;
          position: absolute;
          bottom: 5px;
          left: 5px;
          padding: 4px 8px;
          font-size: 12px;
          font-weight: bold;
          border-radius: 0px;
          border: 1px solid #333;
          pointer-events: none;
          transition: opacity 0.2s ease, visibility 0.2s ease;
        }
        
        /* JAVASCRIPT-BACKED SOLUTION: Ensure hover works for ALL participants */
        .experimental-participant:hover .experimental-name-label {
          opacity: 1 !important;
          visibility: visible !important;
          display: block !important;
          background: rgba(0,0,0,0.95) !important;
          color: white !important;
          border-radius: 0px !important;
          border: 1px solid #333 !important;
          z-index: 99999 !important;
        }
        
        /* Force all name labels to be hoverable */
        .experimental-name-label {
          pointer-events: none !important;
          transition: opacity 0.2s ease !important;
        }
        
        .experimental-name-label {
          width: max-content !important;
          max-width: 200px !important;
          overflow: visible !important;
          white-space: nowrap !important;
        }
        
        /* Clean up video and image styles */
        .experimental-video,
        .experimental-img-wrapper,
        .experimental-img-wrapper > img {
          border: 0 !important;
          outline: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `}</style>
      
      <div
        ref={scrollWrapperRef}
        style={{
          width: '100%',
          height: '100%',
          maxHeight: '100%',
          overflowX: 'hidden',
          overflowY: 'auto',
          backgroundColor: '#000',
          position: 'relative',
          boxSizing: 'border-box',
          border: 'none',
          margin: '0',
          padding: '0'
        }}
        className="scroll-wrapper"
      >
        <div
          ref={gridRef}
          style={gridStyle}
          className="experimental-community-container"
          data-magnifier-active={isMagnifierActive ? "true" : "false"}
          onMouseEnter={() => {
            console.log('🖱️ Container mouse enter - data-magnifier-active:', isMagnifierActive ? "true" : "false");
          }}
        >
          {renderParticipants()}
        </div>
      </div>
    </>
  );
};

export default CommunityViewExperimental; 