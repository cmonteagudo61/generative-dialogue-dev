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
      data-magnifier-active={isActive && isVisible}
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
            <MagnifierContent
              mousePosition={mousePosition}
              scrollPosition={scrollPosition}
              magnification={magnification}
              size={size}
              containerRef={containerRef}
              participantArray={participantArray}
              feedSize={feedSize}
            />

            {/* This style block hides the original labels underneath the magnifier */}
            <style>{`
              [data-magnifier-active="true"] .experimental-participant:hover .experimental-name-label {
                display: none !important;
              }
            `}</style>

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
                  background: 'rgba(255, 255, 255, 0.7)',
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
                  background: 'rgba(255, 255, 255, 0.7)',
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

const MagnifierContent = React.memo(({ 
  mousePosition, 
  scrollPosition, 
  magnification, 
  size, 
  containerRef, 
  participantArray,
  feedSize
}) => {
  if (!containerRef.current) return null;

  const containerWidth = containerRef.current.offsetWidth;
  const feedsPerRow = Math.floor(containerWidth / feedSize);
  
  const randomAvatar = (i) => {
    const baseUrl = 'https://randomuser.me/api/portraits/';
    const type = ['men', 'women'][i % 2];
    const id = (i % 50) + 1;
    return `${baseUrl}${type}/${id}.jpg`;
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: `${containerWidth}px`,
        height: `${(Math.ceil(participantArray.length / feedsPerRow) * feedSize)}px`,
        transform: `translate(${(-mousePosition.x * magnification) + size / 2}px, ${(-(mousePosition.y + scrollPosition.y) * magnification) + size / 2}px) scale(${magnification})`,
        transformOrigin: '0 0',
        pointerEvents: 'none',
      }}
    >
      {participantArray.map((p, i) => {
        const row = Math.floor(i / feedsPerRow);
        const col = i % feedsPerRow;
        const hasVideo = p.tracks?.video?.state === 'playable' && p.tracks?.video?.persistentTrack;
        return (
          <div 
            key={p.session_id} 
            style={{ 
              position: 'absolute', 
              width: `${feedSize}px`, 
              height: `${feedSize}px`,
              left: `${col * feedSize}px`,
              top: `${row * feedSize}px`,
              background: '#333',
              overflow: 'hidden'
            }}
          >
            {hasVideo ? (
              <video
                ref={el => {
                  if (el && p.tracks?.video?.persistentTrack) {
                    el.srcObject = new MediaStream([p.tracks.video.persistentTrack]);
                  }
                }}
                autoPlay
                playsInline
                muted={p.local}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <img 
                src={p.avatar || randomAvatar(i)} 
                alt={p.user_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => e.target.style.display = 'none'}
              />
            )}
            
            {/* Logic to render the center participant's name label */}
            {(() => {
              const mouseX = mousePosition.x;
              const mouseY = mousePosition.y + scrollPosition.y;
              const pX = col * feedSize;
              const pY = row * feedSize;
              const pEndX = pX + feedSize;
              const pEndY = pY + feedSize;
              const isCentered = mouseX >= pX && mouseX <= pEndX && mouseY >= pY && mouseY <= pEndY;

              if (isCentered) {
                const displayName = p.user_name || (p.local ? 'You' : `User ${i}`);
                return (
                  <div style={{
                    position: 'absolute',
                    bottom: '2px', /* reduced by ~50% */
                    left: '2px',  /* reduced by ~50% */
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '1px 2.5px',
                    borderRadius: '0px',
                    fontSize: '6px',
                    zIndex: 10,
                    whiteSpace: 'nowrap'
                  }}>
                    {displayName}
                  </div>
                );
              }
              return null;
            })()}
          </div>
        )
      })}
    </div>
  )
});

export default LoopMagnifier; 