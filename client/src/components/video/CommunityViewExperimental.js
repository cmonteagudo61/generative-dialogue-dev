import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MicrophoneOff,
  CameraOff,
  DefaultGrey
} from '../../assets/icons';
import './CommunityViewExperimental.css';
import LoopMagnifier from './LoopMagnifier';

// Constants moved to inside component to avoid duplication

// Helper to generate a deterministic "random" avatar based on index - ONLY human photos from randomuser.me
const randomAvatar = (i) => {
  const baseUrl = 'https://randomuser.me/api/portraits/';
  const type = ['men', 'women'][i % 2];
  const id = (i % 50) + 1;
  return `${baseUrl}${type}/${id}.jpg`;
};



const CommunityViewTile = React.memo(({
  participant,
  index,
  style,
  createVideoRef,
  getParticipantIcon,
  isMagnifierActive,
  isCenterParticipant,
  onCenterChange
}) => {
  const hasVideo = participant.tracks?.video?.state === 'playable' && participant.tracks?.video?.persistentTrack;
  const displayName = participant.local
    ? (participant.displayName || participant.user_name || 'You')
    : (participant.displayName || participant.user_name || 'Participant');

  // Notify parent if this tile is the center participant
  useEffect(() => {
    if (isCenterParticipant) {
      onCenterChange(displayName);
    }
  }, [isCenterParticipant, displayName, onCenterChange]);

  return (
    <div
      key={participant.session_id}
      className="experimental-participant"
      tabIndex={0}
      data-participant-index={index}
      data-participant-name={displayName}
      style={style}
      onMouseEnter={(e) => {
        const nameLabel = e.currentTarget.querySelector('.experimental-name-label');
        if (nameLabel) {
          nameLabel.style.opacity = '1';
          nameLabel.style.visibility = 'visible';
        }
      }}
      onMouseLeave={(e) => {
        const nameLabel = e.currentTarget.querySelector('.experimental-name-label');
        if (nameLabel) {
          nameLabel.style.opacity = '0';
          nameLabel.style.visibility = 'hidden';
        }
      }}
    >
      <div className="experimental-participant-inner">
        {hasVideo ? (
          <video
            ref={createVideoRef(participant.session_id)}
            autoPlay
            playsInline
            muted={participant.local}
            className="experimental-video"
          />
        ) : (
          <div className="experimental-img-wrapper">
            <img
              src={participant.avatar || randomAvatar(index)}
              alt={displayName}
              loading="lazy"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}
      </div>
      <div 
        className={`experimental-name-label ${isCenterParticipant ? 'center-label' : ''}`}
        style={{
          opacity: isMagnifierActive && isCenterParticipant ? 1 : 0,
          visibility: isMagnifierActive && isCenterParticipant ? 'visible' : 'hidden',
        }}
      >
        {displayName}
      </div>
      {!participant.session_id.includes('mock') && getParticipantIcon(participant) && (
        <img
          src={getParticipantIcon(participant)}
          alt=""
          className="experimental-status-icon"
        />
      )}
    </div>
  );
});

const CommunityViewExperimental = React.memo(({ 
  participants = [], 
  viewMode = 'community', 
  showLabels = false,
  isMagnifierActive = false,
  magnifierSize = 200,
  forceUpdate = 0,
  onCenterParticipantChange = null,
  onParticipantArrayReady = null,
  mockParticipantCount = 500
}) => {
  // State declarations must come first
  const gridRef = useRef(null);
  const scrollWrapperRef = useRef(null);
  const [gridStyle, setGridStyle] = useState({});
  const [debugInfo, setDebugInfo] = useState({});
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const feedsPerRowRef = useRef(Math.max(1, Math.floor(((typeof window !== 'undefined' ? window.innerWidth : 960) ) / 60)));

  // FLICKERING FIX: Create stable refs for video elements with throttling
  const videoRefs = useRef(new Map());
  const resizeObservers = useRef(new Map());
  const trackStates = useRef(new Map());
  const videoUpdateTimers = useRef(new Map()); // Throttle video updates
  const mediaStreamsRef = useRef(new Map()); // Cache MediaStreams per track id to avoid churn

  // Accept both array and object - MOVED UP to fix dependency order
  const realParticipants = useMemo(() => (
    Array.isArray(participants)
      ? participants
      : Object.values(participants)
  ), [participants]);

  // Generate mock participants for testing (ensure we have enough to test)
  const generateMockParticipants = useCallback((count) => {
    const firstNames = ["Alex", "Jordan", "Casey", "Morgan", "Taylor", "Riley", "Avery", "Quinn", "Sage", "Cameron"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
    
    return Array.from({ length: count }, (_, i) => {
      // Test long names for first 3 participants
      let userName;
      if (i === 0) {
        userName = "Dr. Alexandra Thompson-Williams";
      } else if (i === 1) {
        userName = "Professor Christopher Montgomery-Smith III";
      } else if (i === 2) {
        userName = "Maria Elena Rodriguez-Gonzalez de la Cruz";
      } else if (i < 20) {
        // More realistic test names for first 20
        userName = `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`;
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
  }, [realParticipants]);

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
    
    // Quiet logs in production to reduce jank
    
    return [...realParticipants, ...mockParticipants];
  }, [participants, mockParticipantCount, generateMockParticipants]);

  // FLICKERING FIX: Enhanced stable video ref handler with Daily.co specific optimizations
  const createVideoRef = useCallback((sessionId) => {
    return (el) => {
      if (!el) {
        // Cleanup when element is unmounted
        videoRefs.current.delete(sessionId);
        trackStates.current.delete(sessionId);
        
        // Cleanup ResizeObserver
        const observer = resizeObservers.current.get(sessionId);
        if (observer) {
          observer.disconnect();
          resizeObservers.current.delete(sessionId);
        }
        return;
      }

      // Store the video element
      videoRefs.current.set(sessionId, el);
      
      // Find participant (use closure to avoid dependency on realParticipants)
      const participant = participantArray.find(p => p.session_id === sessionId);
      if (!participant) return;

      // Enhanced Daily.co track handling
      const track = participant.tracks?.video?.persistentTrack;
      const currentTrackState = trackStates.current.get(sessionId);
      
      // More robust track comparison - check multiple properties
      const trackChanged = !currentTrackState ||
                          (track?.id !== currentTrackState.trackId) ||
                          (track?.enabled !== currentTrackState.enabled) ||
                          (track?.readyState !== currentTrackState.readyState);
      
             if (track && trackChanged) {
         // Throttle video updates to prevent excessive flickering
         const existingTimer = videoUpdateTimers.current.get(sessionId);
         if (existingTimer) {
           clearTimeout(existingTimer);
         }
         
        const timer = setTimeout(() => {
           // Only update if track actually changed and element still exists
           const currentEl = videoRefs.current.get(sessionId);
           if (currentEl && track) {
            // Reuse a single MediaStream per track to avoid tearing
            let ms = mediaStreamsRef.current.get(track.id);
            if (!ms) {
              ms = new window.MediaStream([track]);
              mediaStreamsRef.current.set(track.id, ms);
            }
            if (currentEl.srcObject !== ms) {
              currentEl.srcObject = ms;
            }
            // Store enhanced track state
             trackStates.current.set(sessionId, {
               trackId: track.id,
               enabled: track.enabled,
               readyState: track.readyState,
               lastUpdate: Date.now()
             });
            // logging disabled for stability
           }
           videoUpdateTimers.current.delete(sessionId);
         }, 50); // 50ms throttle to prevent rapid fire updates
         
         videoUpdateTimers.current.set(sessionId, timer);
       } else if (!track && currentTrackState) {
         // Remove track immediately (no throttling for removal)
         el.srcObject = null;
         trackStates.current.delete(sessionId);
         
        // Clear any pending update
         const existingTimer = videoUpdateTimers.current.get(sessionId);
         if (existingTimer) {
           clearTimeout(existingTimer);
           videoUpdateTimers.current.delete(sessionId);
         }
        // logging disabled for stability
       }
    };
  }, [participantArray]); // Include participantArray dependency

  // FLICKERING FIX: Move ResizeObserver to useEffect for proper lifecycle management
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;

    realParticipants.forEach(participant => {
      const sessionId = participant.session_id;
      const videoElement = videoRefs.current.get(sessionId);
      
      if (videoElement && !resizeObservers.current.has(sessionId)) {
        const resizeObserver = new ResizeObserver((entries) => {
          // Throttle ResizeObserver to prevent excessive calls
          setTimeout(() => {
            // eslint-disable-next-line no-unused-vars
            for (let _entry of entries) {
              const currentEl = videoRefs.current.get(sessionId);
              if (currentEl) {
                currentEl.style.width = '100%';
                currentEl.style.height = '100%';
                currentEl.style.objectFit = 'cover';
                currentEl.style.position = 'absolute';
                currentEl.style.top = '0';
                currentEl.style.left = '0';
              }
            }
          }, 16); // ~60fps throttle for smooth but not excessive updates
        });
        
        const container = videoElement.parentElement;
        if (container) {
          resizeObserver.observe(container);
          resizeObservers.current.set(sessionId, resizeObserver);
        }
      }
    });

    // Cleanup observers for participants that no longer exist
    const currentSessionIds = new Set(realParticipants.map(p => p.session_id));
    for (const [sessionId, observer] of resizeObservers.current.entries()) {
      if (!currentSessionIds.has(sessionId)) {
        observer.disconnect();
        resizeObservers.current.delete(sessionId);
      }
    }
  }, [realParticipants]);

  // FLICKERING FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Copy ref values to avoid exhaustive-deps warning
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const observers = resizeObservers.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const videos = videoRefs.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const tracks = trackStates.current;
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const timers = videoUpdateTimers.current;
      
      // Cleanup all timers first
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
      
      // Cleanup all ResizeObservers
      for (const observer of observers.values()) {
        observer.disconnect();
      }
      observers.clear();
      videos.clear();
      tracks.clear();
    };
  }, []);

  useEffect(() => {}, [isMagnifierActive]);

  // Constants
  const MIN_SIZE = 60;

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
    // quiet
  }, [participantArray.length, isMagnifierActive]);

  // Calculate visible range based on scroll position
  const updateVisibleRange = useCallback(() => {
    if (!scrollWrapperRef.current || !gridRef.current) return;

    // FIXED: Always show all participants to match first 12 behavior
    // This eliminates the virtualization that was causing hover issues
    setVisibleRange({ start: 0, end: participantArray.length });
    // quiet
  }, [participantArray.length]);

  // Handle scroll events (disabled to prevent heartbeat reflows)
  useEffect(() => { updateVisibleRange(); }, [updateVisibleRange]);

  useEffect(() => {
    if (isMagnifierActive) {
      // Force immediate update of visible range when magnifier becomes active
      updateVisibleRange();
    }
  }, [isMagnifierActive, updateVisibleRange]);

  // Static grid sizing to avoid continuous resize-induced reflows
  useEffect(() => {
    const feedsPerRow = feedsPerRowRef.current;
    const totalRows = Math.ceil(participantArray.length / feedsPerRow);
    const totalHeight = totalRows * MIN_SIZE;
    setGridStyle({
      width: '100%',
      height: `${totalHeight}px`,
      position: 'relative',
      backgroundColor: '#000',
      overflow: 'visible'
    });
    setDebugInfo({ feedsPerRow, totalRows, totalHeight, participantCount: participantArray.length });
    updateVisibleRange();
    // No listeners attached on purpose
  }, [participantArray.length, updateVisibleRange]);

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
    const participantsToRender = participantArray.slice(visibleRange.start, visibleRange.end);

    return participantsToRender.map((participant, renderIndex) => {
      const i = visibleRange.start + renderIndex;
      const feedSize = MIN_SIZE;
      const feedsPerRow = debugInfo.feedsPerRow || feedsPerRowRef.current || 10;
      const col = i % feedsPerRow;
      const row = Math.floor(i / feedsPerRow);
      const x = col * feedSize;
      const y = row * feedSize;

      let isCenterParticipant = false;
      if (isMagnifierActive) {
        // Simplified logic: when magnifier is active, determine center based on a fixed point or other logic
        // For now, we'll just set it to false to prevent the flicker.
        isCenterParticipant = false;
      }

      return (
        <CommunityViewTile
          key={participant.session_id}
          participant={participant}
          index={i}
          style={{ 
            position: 'absolute',
            left: `${x}px`,
            top: `${y}px`,
            width: `${feedSize}px`,
            height: `${feedSize}px`,
          }}
          createVideoRef={createVideoRef}
          getParticipantIcon={getParticipantIcon}
          isMagnifierActive={isMagnifierActive}
          isCenterParticipant={isCenterParticipant}
          onCenterChange={onCenterParticipantChange}
        />
      );
    });
  };

  return (
    <LoopMagnifier
      isActive={isMagnifierActive}
      magnification={2.5}
      size={magnifierSize}
      participantArray={participantArray}
      feedSize={MIN_SIZE}
    >
      <style>{`
        /* Scoped anti-flicker: disable transitions/animations and stabilize video */
        .experimental-community-container,
        .experimental-community-container *,
        .experimental-community-container *::before,
        .experimental-community-container *::after {
          animation: none !important;
          transition: none !important;
          backface-visibility: hidden !important;
        }
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
          bottom: 2.5px; /* reduced spacing to bottom by 50% */
          left: 2.5px;  /* reduced spacing to left by 50% */
          padding: 4px 8px;
          font-size: 12px;
          font-weight: bold;
          border-radius: 0px; /* square corners */
          border: 1px solid #333;
          pointer-events: none;
          /* no transitions to avoid flicker */
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
          /* no transitions to avoid flicker */
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
          transform: none !important;
          will-change: auto !important;
          backface-visibility: hidden !important;
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
          onMouseEnter={() => {}}
        >
          {renderParticipants()}
        </div>
      </div>
    </LoopMagnifier>
  );
});

export default CommunityViewExperimental; 