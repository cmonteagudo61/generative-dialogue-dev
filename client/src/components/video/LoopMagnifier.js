import React, { useState, useEffect, useRef } from 'react';

const LoopMagnifier = ({ isActive, children, magnification = 2.5, size = 200, participantArray = [], feedSize = 60 }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef(null);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef(null);
  // eslint-disable-next-line no-unused-vars
  const [centerParticipantName, setCenterParticipantName] = useState('');

  // Debug logging for isActive prop changes
  useEffect(() => {
    console.log('🔍 LoopMagnifier isActive changed:', isActive);
  }, [isActive]);

  // Simplified scroll position tracking
  const updateScrollPosition = () => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollWrapper = container.querySelector('.scroll-wrapper') || 
                         container.querySelector('[class*="scroll"]') ||
                         container.firstElementChild;
    
    const currentScrollX = scrollWrapper?.scrollLeft || container?.scrollLeft || 0;
    const currentScrollY = scrollWrapper?.scrollTop || container?.scrollTop || 0;
    
    setScrollPosition({ x: currentScrollX, y: currentScrollY });
    
    // Reduced frequency of force updates to prevent performance issues
    setForceUpdate(prev => prev + 1);
  };

  useEffect(() => {
    if (!isActive) {
      setIsVisible(false);
      return;
    }

    // Initialize scroll position when magnifier becomes active
    updateScrollPosition();

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        setMousePosition({ x, y });
        setIsVisible(true);
        
        // Ensure scroll position is current when magnifier becomes visible
        updateScrollPosition();
      } else {
        setIsVisible(false);
      }
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    const handleScroll = () => {
      // Always update scroll position when scrolling occurs, regardless of magnifier visibility
      // This ensures the magnified content stays synchronized when magnifier becomes visible
      updateScrollPosition();
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
      
      // Simplified scroll listener - only listen to the main scroll container
      const scrollWrapper = container.querySelector('.scroll-wrapper') || 
                           container.querySelector('[class*="scroll"]') ||
                           container.firstElementChild;
      
      if (scrollWrapper) {
        scrollWrapper.addEventListener('scroll', handleScroll, { passive: true });
      }
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
        
        const scrollWrapper = container.querySelector('.scroll-wrapper') || 
                             container.querySelector('[class*="scroll"]') ||
                             container.firstElementChild;
        
        if (scrollWrapper) {
          scrollWrapper.removeEventListener('scroll', handleScroll);
        }
      }
      
      // Copy ref value to avoid exhaustive-deps warning
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const animationFrame = animationFrameRef.current;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isActive, isVisible]);

  // Effect to handle overflow clipping during magnification
  useEffect(() => {
    const scrollWrapper = containerRef.current?.querySelector('.scroll-wrapper');
    const parentContainer = containerRef.current;
    
    if (isActive && isVisible) {
      const originalScrollWrapperOverflow = scrollWrapper?.style.overflow;
      const originalParentOverflow = parentContainer?.style.overflow;
      
      if (scrollWrapper) {
        scrollWrapper.style.overflow = 'visible';
      }
      if (parentContainer) {
        parentContainer.style.overflow = 'visible';
      }
      
      return () => {
        if (scrollWrapper) {
          scrollWrapper.style.overflow = originalScrollWrapperOverflow || 'auto';
        }
        if (parentContainer) {
          parentContainer.style.overflow = originalParentOverflow || 'visible';
        }
      };
    }
  }, [isActive, isVisible]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        cursor: isActive ? 'none' : 'default',
      }}
    >
      {/* Original content - use render prop pattern */}
      {typeof children === 'function' ? (
        children({
          centerMousePosition: isVisible ? mousePosition : null,
          scrollPosition,
          isMagnifierActive: isActive && isVisible,
          magnifierSize: size,
          forceUpdate,
          onCenterParticipantChange: (name) => setCenterParticipantName(name)
        })
      ) : (
        children
      )}

      {/* Magnifier overlay */}
      {isActive && isVisible && (
        <>
          {/* Magnifying glass handle */}
          <div
            style={{
              position: 'absolute',
              left: `${mousePosition.x + (size / 2) * 0.65}px`,
              top: `${mousePosition.y + (size / 2) * 0.65}px`,
              width: '60px',
              height: '8px',
              background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #CD853F 100%)',
              transform: 'rotate(45deg)',
              transformOrigin: '0 50%',
              borderRadius: '4px',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              pointerEvents: 'none',
              zIndex: 999,
            }}
          />

          {/* Magnifier lens */}
          <div
            style={{
              position: 'absolute',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              border: '4px solid #3E4C71',
              boxShadow: '0 0 20px rgba(62, 76, 113, 0.5)',
              pointerEvents: 'none',
              zIndex: 1000,
              left: `${mousePosition.x - size / 2}px`,
              top: `${mousePosition.y - size / 2}px`,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.95)',
            }}
          >
            {/* Independent Magnifier Content - Renders participants on demand */}
            <MagnifierContent 
              mousePosition={mousePosition}
              scrollPosition={scrollPosition}
              magnification={magnification}
              size={size}
              containerRef={containerRef}
              onCenterParticipantChange={setCenterParticipantName}
              participantArray={participantArray}
              feedSize={feedSize}
            />
            

            
            {/* CSS to hide background labels when magnifier active */}
            <style>{`
              /* Hide ALL background labels when magnifier is active */
              body .experimental-name-label:not(.magnified-content .experimental-name-label),
              div .experimental-name-label:not(.magnified-content .experimental-name-label),
              .experimental-community-container .experimental-name-label:not(.magnified-content .experimental-name-label) {
                opacity: 0 !important;
                visibility: hidden !important;
                display: none !important;
                pointer-events: none !important;
                background: rgba(0,0,0,0.95) !important;
                color: white !important;
                border-radius: 0px !important;
              }
              
              /* FORCE magnified content labels to be visible with consistent black background styling */
              .magnified-content .experimental-name-label {
                opacity: 1 !important;
                visibility: visible !important;
                display: block !important;
                pointer-events: auto !important;
                background: rgba(0,0,0,0.95) !important;
                color: white !important;
                border: 1px solid #333 !important;
                border-radius: 0px !important;
                font-weight: normal !important;
                z-index: 999 !important;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3) !important;
              }
              
              /* Ensure magnifier content doesn't get clipped */
              .magnified-content {
                overflow: visible !important;
              }
              
              /* Force magnifier to be above everything */
              div[style*="z-index: 1000"] {
                z-index: 999999 !important;
              }
              
              /* Fix hover effects for background when magnifier is NOT active */
              .experimental-community-container:not([data-magnifier-active="true"]) .experimental-participant:hover .experimental-name-label {
                opacity: 1 !important;
                visibility: visible !important;
                display: block !important;
                background: rgba(0,0,0,0.95) !important;
                color: white !important;
                border-radius: 0px !important;
              }
              
              /* Ensure ALL background participants (including virtualized ones) can show hover labels */
              .experimental-community-container:not([data-magnifier-active="true"]) .experimental-name-label {
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease-in-out;
                background: rgba(0,0,0,0.95) !important;
                color: white !important;
                border-radius: 0px !important;
              }
              
              /* Make sure hover works for ALL participants, not just first 12 */
              .experimental-community-container:not([data-magnifier-active="true"]) .experimental-participant:hover .experimental-name-label {
                opacity: 1 !important;
                visibility: visible !important;
                display: block !important;
                z-index: 999 !important;
                background: rgba(0,0,0,0.95) !important;
                color: white !important;
                border-radius: 0px !important;
              }
            `}</style>
            
            {/* Glass reflection effect */}
            <div
              style={{
                position: 'absolute',
                top: '8px',
                left: '8px',
                right: '8px',
                bottom: '8px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, transparent 50%, rgba(0,0,0,0.05) 100%)',
                pointerEvents: 'none',
              }}
            />
            
            {/* Center crosshair */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '16px',
                height: '16px',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '0',
                  right: '0',
                  height: '1px',
                  background: 'rgba(62, 76, 113, 0.7)',
                  transform: 'translateY(-50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '0',
                  bottom: '0',
                  width: '1px',
                  background: 'rgba(62, 76, 113, 0.7)',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// Independent Magnifier Content Component - Renders participants on demand
const MagnifierContent = ({ 
  mousePosition, 
  scrollPosition, 
  magnification, 
  size, 
  containerRef, 
  onCenterParticipantChange,
  participantArray, // RECEIVE participant array from background
  feedSize // RECEIVE feed size from background
}) => {
  // Use EXACT same participant array and feed size as background
  const MIN_SIZE = feedSize || 60; // Default to 60px if not provided

  // Helper to generate deterministic avatar images (EXACT SAME as background)
  const randomAvatar = (i) => {
    const baseUrl = 'https://randomuser.me/api/portraits/';
    const type = ['men', 'women'][i % 2];
    const id = (i % 50) + 1;
    return `${baseUrl}${type}/${id}.jpg`;
  };

  // Calculate which participants should be visible in the magnified view
  // CRITICAL: Use EXACT same coordinate system as background grid
  const getVisibleParticipantsInMagnifier = () => {
    if (!containerRef.current || !participantArray || participantArray.length === 0) return [];

    // Use EXACT same coordinate system as CommunityViewExperimental
    const container = containerRef.current;
    const actualContainerWidth = container.offsetWidth;
    const feedSize = MIN_SIZE; // EXACT same as background: 60px
    const feedsPerRow = Math.floor(actualContainerWidth / feedSize); // EXACT same calculation
    
    if (feedsPerRow <= 0) return [];

    // Calculate the area that the magnifier is showing
    const magnifierAreaSize = size / magnification; // Actual area being magnified
    const mousePosWithScroll = {
      x: mousePosition.x,
      y: mousePosition.y + scrollPosition.y
    };

    // Calculate the bounds of the area being magnified
    const magnifiedArea = {
      left: mousePosWithScroll.x - (magnifierAreaSize / 2),
      right: mousePosWithScroll.x + (magnifierAreaSize / 2),
      top: mousePosWithScroll.y - (magnifierAreaSize / 2),
      bottom: mousePosWithScroll.y + (magnifierAreaSize / 2)
    };

    // Find all participants that intersect with this area
    const visibleParticipants = [];
    
    for (let i = 0; i < participantArray.length; i++) {
      // EXACT same coordinate calculation as background grid
      const col = i % feedsPerRow;
      const row = Math.floor(i / feedsPerRow);
      const x = col * feedSize;
      const y = row * feedSize;
      
      // Check if this participant intersects with the magnified area
      const participantBounds = {
        left: x,
        right: x + feedSize,
        top: y,
        bottom: y + feedSize
      };
      
      const intersects = (
        participantBounds.left < magnifiedArea.right &&
        participantBounds.right > magnifiedArea.left &&
        participantBounds.top < magnifiedArea.bottom &&
        participantBounds.bottom > magnifiedArea.top
      );
      
      if (intersects) {
        visibleParticipants.push({
          participant: participantArray[i],
          index: i,
          position: { x, y }, // EXACT same coordinates as background
          bounds: participantBounds
        });
      }
    }

    // Find center participant for naming
    const centerParticipant = visibleParticipants.find(p => 
      mousePosWithScroll.x >= p.bounds.left && 
      mousePosWithScroll.x <= p.bounds.right &&
      mousePosWithScroll.y >= p.bounds.top && 
      mousePosWithScroll.y <= p.bounds.bottom
    );

    if (centerParticipant && onCenterParticipantChange) {
      onCenterParticipantChange(centerParticipant.participant.user_name);
    }

    console.log('🔍 COORDINATE-MATCHED magnifier rendering:', {
      magnifiedArea,
      participantsInView: visibleParticipants.length,
      centerParticipant: centerParticipant?.participant.user_name,
      totalParticipants: participantArray.length,
      feedSize,
      feedsPerRow,
      actualContainerWidth,
      scrollPosition: scrollPosition.y,
      mousePosition
    });

    return visibleParticipants;
  };

  const visibleParticipants = getVisibleParticipantsInMagnifier();

  return (
    <div
      className="magnified-content"
      style={{
        position: 'absolute',
        width: `${containerRef.current?.offsetWidth || 0}px`,
        height: `${containerRef.current?.offsetHeight || 0}px`,
        transform: `translate(${(-mousePosition.x * magnification) + size / 2}px, ${(-(mousePosition.y + scrollPosition.y) * magnification) + size / 2}px) scale(${magnification})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
        zIndex: 1,
        left: '0px',
        top: '0px',
      }}
    >
      {/* Render participants with EXACT same logic as background grid */}
      {visibleParticipants.map(({ participant, index, position, bounds }) => {
        const feedSize = MIN_SIZE; // EXACT same as background: 60px
        const displayName = participant.user_name || `User ${index}`;
        const hasVideo = participant.tracks?.video?.state === 'playable' && participant.tracks?.video?.persistentTrack;
        
        // Determine if this is the center participant (under the magnifier crosshair)
        const mousePosWithScroll = {
          x: mousePosition.x,
          y: mousePosition.y + scrollPosition.y
        };
        
        const isCenterParticipant = 
          mousePosWithScroll.x >= bounds.left && 
          mousePosWithScroll.x <= bounds.right &&
          mousePosWithScroll.y >= bounds.top && 
          mousePosWithScroll.y <= bounds.bottom;
        
        return (
          <div
            key={`magnifier-${participant.session_id}`}
            className="experimental-participant"
            style={{ 
              position: 'absolute',
              left: `${position.x}px`, // EXACT same coordinates as background
              top: `${position.y}px`,  // EXACT same coordinates as background
              width: `${feedSize}px`,  // EXACT same size as background
              height: `${feedSize}px`, // EXACT same size as background
              backgroundColor: 'rgba(0,0,0,0.8)', // Match background styling
              overflow: 'visible',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              border: '1px solid #333' // Match background styling
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
              {/* EXACT same logic as background: video OR avatar fallback */}
              {hasVideo ? (
                <video
                  ref={(el) => {
                    if (el) {
                      const track = participant.tracks?.video?.persistentTrack;
                      if (track) {
                        el.srcObject = new window.MediaStream([track]);
                      }
                    }
                  }}
                  autoPlay
                  playsInline
                  muted={participant.local}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: '#000'
                  }}
                />
              ) : (
                <img
                  src={participant.avatar || randomAvatar(index)} // EXACT same fallback as background
                  alt={displayName}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    backgroundColor: '#333'
                  }}
                  onError={(e) => {
                    // Fallback to black background if image fails to load
                    e.target.style.display = 'none';
                    e.target.parentElement.style.backgroundColor = 'rgba(0,0,0,0.95)';
                    e.target.parentElement.style.color = 'white';
                    e.target.parentElement.style.fontSize = '12px';
                    e.target.parentElement.style.fontWeight = 'bold';
                    e.target.parentElement.textContent = displayName;
                  }}
                />
              )}
              
              {/* ONLY show name label for center participant with EXACT background styling */}
              {isCenterParticipant && (
                <div
                  className="experimental-name-label"
                  style={{
                    position: 'absolute',
                    bottom: '0px',
                    left: '0px',
                    background: 'rgba(0,0,0,0.95)', // Match CommunityViewExperimental styling
                    color: 'white', // Match CommunityViewExperimental styling
                    borderRadius: '0px', // Square corners
                    padding: '4px 12px 4px 6px', // EXACT same as background
                    fontSize: '11px', // EXACT same as background
                    textAlign: 'left', // EXACT same as background
                    whiteSpace: 'nowrap',
                    overflow: 'visible',
                    textOverflow: 'ellipsis',
                    fontWeight: 'normal', // EXACT same as background
                    lineHeight: '1.2',
                    zIndex: 999,
                    border: 'none', // EXACT same as background (no border)
                    boxShadow: 'none', // No shadow like background
                    minWidth: 'max-content',
                    width: 'max-content',
                    maxWidth: '200px',
                    boxSizing: 'border-box'
                  }}
                >
                  {displayName}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default LoopMagnifier; 