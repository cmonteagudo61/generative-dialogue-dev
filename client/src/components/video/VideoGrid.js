/* BACKUP FILE - VideoGrid.js - WORKING VERSION 2025
 * This is the MAIN UI coordinator file that handles all view modes:
 * - self, dyad, triad, quad, kiva, community
 * - Switches between CommunityViewExperimental and CommunityViewDebug
 * - Handles experimental mode state (removed toggle buttons)
 * - Critical for restoring complete UI functionality
 */

import React, { useRef, useEffect, useState } from 'react';
import './VideoGridLayout.css';
// eslint-disable-next-line no-unused-vars
import CommunityView from './CommunityView';
import CommunityViewExperimental from './CommunityViewExperimental';
import CommunityViewDebug from './CommunityViewDebug';
import FishbowlView from './FishbowlView';
import LoopMagnifier from './LoopMagnifier';

const getGridTemplate = (layout) => {
  switch (layout) {
    case 'self':
      return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
    case 'dyad':
      return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr' };
    case 'triad':
      return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr', aspectRatio: '9/12' };
    case 'quad':
      return { gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr' };
    case 'kiva':
      return { gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr' };
    case 'community':
      return { gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gridTemplateRows: '1fr' };
    case 'fishbowl':
      return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' }; // Full container for fishbowl
    default:
      return { gridTemplateColumns: '1fr', gridTemplateRows: '1fr' };
  }
};

const getMaxTiles = (layout, participantsLength) => {
  switch (layout) {
    case 'dyad': return 2;
    case 'triad': return 3;
    case 'quad': return 4;
    case 'kiva': return 6;
    case 'community': return Math.max(participantsLength, 8);
    case 'fishbowl': return participantsLength; // Use all participants
    default: return 1;
  }
};

// Helper to generate mock participants (with placeholder image)
const getMockParticipants = (count, startIndex = 1) => {
  return Array.from({ length: count }).map((_, i) => ({
    session_id: `mock-${startIndex + i}`,
    user_name: `Mock User ${startIndex + i}`,
    tracks: { video: { state: 'unavailable' } },
    local: false,
    mockImage: `https://placehold.co/400x300?text=Mock+${startIndex + i}`,
  }));
};

const VideoGrid = ({ participants = [], layout = 'self', showLabels = false, useExperimentalView = true, selectedParticipants = [], onParticipantSelect, isLoopActive = false }) => {
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const [experimentalMode] = useState(useExperimentalView);
  const [labelsVisible] = useState(showLabels);
  const quadWrapperRef = useRef(null);
  const [quadGridWidth, setQuadGridWidth] = useState('100%');
  const [magnifierParticipantArray, setMagnifierParticipantArray] = useState([]);
  const [magnifierFeedSize, setMagnifierFeedSize] = useState(60);

  // Callback to receive participant array from CommunityViewExperimental
  const handleParticipantArrayReady = (participantArray, feedSize) => {
    setMagnifierParticipantArray(participantArray);
    setMagnifierFeedSize(feedSize);
  };

  // Community layout logging effect
  useEffect(() => {
    if (layout === 'community') {
              console.log('🔍 VideoGrid - Community mode activated', { 
        layout, 
        participantCount: participants.length, 
        experimentalMode, 
        labelsVisible 
      });
    }
  }, [layout, participants.length, experimentalMode, labelsVisible]);

  // Dynamic sizing for quad view (2:1 grid)
  useEffect(() => {
    if (layout !== 'quad') return;
    function updateQuadGridWidth() {
      if (!quadWrapperRef.current) return;
      const availableHeight = quadWrapperRef.current.offsetHeight;
      const maxWidth = availableHeight * 2; // 2:1 aspect for the grid (width = height * 2)
      setQuadGridWidth(Math.min(window.innerWidth, maxWidth) + 'px');
    }
    updateQuadGridWidth();
    window.addEventListener('resize', updateQuadGridWidth);
    return () => window.removeEventListener('resize', updateQuadGridWidth);
  }, [layout]);

  // Always fill the grid with real participants first, then mocks as needed
  const maxTiles = getMaxTiles(layout, participants.length);
  const realTiles = participants.slice(0, maxTiles);
  const mockTiles = getMockParticipants(Math.max(0, maxTiles - realTiles.length), realTiles.length + 1);
  const tiles = [...realTiles, ...mockTiles];

  const gridStyle = {
    display: 'grid',
    width: '100%',
    height: '100%',
    background: '#000',
    gap: '8px',
    alignItems: 'center',
    justifyItems: 'center',
    ...getGridTemplate(layout),
  };

  // Helper to decide object-fit based on tile size
  const getObjectFit = (el) => {
    // Use fill to allow video sides to collapse and fit the available space
    return 'fill';
  };

  if (layout === 'kiva') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100vw',
          maxHeight: '100vh',
          margin: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#000',
        }}
      >
        <div
          className={`video-grid kiva-view`}
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '1px',
            background: '#222',
          }}
        >
          {tiles.map((p, i) => (
            <div
              className={`video-tile kiva-view-tile`}
              key={p.session_id || i}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 0,
                minWidth: 0,
              }}
            >
              {p.tracks?.video?.state === 'playable' && p.tracks?.video?.persistentTrack ? (
                <VideoTileWithFit participant={p} getObjectFit={getObjectFit} />
              ) : p.mockImage ? (
                <MockTileBackground image={p.mockImage} userName={p.user_name} />
              ) : (
                <div style={{ color: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                  Waiting for video...
                </div>
              )}
              {showLabels && (
                <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, color: '#fff', background: 'rgba(0,0,0,0.5)', fontSize: 14, borderRadius: 4, padding: '2px 6px', textAlign: 'center' }}>
                  {p.user_name || p.userName || (p.local ? 'You' : 'Participant')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'quad') {
    return (
      <div
        ref={quadWrapperRef}
        style={{
          height: '100%',
          width: '100%',
          aspectRatio: '2/1',
          maxHeight: '100vh',
          maxWidth: '100vw',
          margin: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#000',
        }}
      >
        <div
          className={`video-grid quad-view`}
          style={{
            width: quadGridWidth,
            height: '100%',
            aspectRatio: '2/1',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: '1fr 1fr',
            gap: '1px',
            background: '#222',
          }}
        >
          {tiles.map((p, i) => (
            <div
              className={`video-tile quad-view-tile`}
              key={p.session_id || i}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 0,
                minWidth: 0,
              }}
            >
              {p.tracks?.video?.state === 'playable' && p.tracks?.video?.persistentTrack ? (
                <VideoTileWithFit participant={p} getObjectFit={getObjectFit} />
              ) : p.mockImage ? (
                <MockTileBackground image={p.mockImage} userName={p.user_name} />
              ) : (
                <div style={{ color: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                  Waiting for video...
                </div>
              )}
              {showLabels && (
                <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, color: '#fff', background: 'rgba(0,0,0,0.5)', fontSize: 14, borderRadius: 4, padding: '2px 6px', textAlign: 'center' }}>
                  {p.user_name || p.userName || (p.local ? 'You' : 'Participant')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (layout === 'triad') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          maxWidth: '100vw',
          maxHeight: '100vh',
          margin: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#000',
        }}
      >
        <div
          className={`video-grid triad-view`}
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gridTemplateRows: '1fr',
            gap: '1px',
            background: '#222',
          }}
        >
          {tiles.map((p, i) => (
            <div
              className={`video-tile triad-view-tile`}
              key={p.session_id || i}
              style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                minHeight: 0,
                minWidth: 0,
                overflow: 'hidden'
              }}
            >
              {p.tracks?.video?.state === 'playable' && p.tracks?.video?.persistentTrack ? (
                <VideoTileWithFit participant={p} getObjectFit={getObjectFit} />
              ) : p.mockImage ? (
                <MockTileBackground image={p.mockImage} userName={p.user_name} />
              ) : (
                <div style={{ color: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
                  Waiting for video...
                </div>
              )}
              {showLabels && (
                <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, color: '#fff', background: 'rgba(0,0,0,0.5)', fontSize: 14, borderRadius: 4, padding: '2px 6px', textAlign: 'center' }}>
                  {p.user_name || p.userName || (p.local ? 'You' : 'Participant')}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const gridElement = (
    <div className={`video-grid${layout === 'self' ? ' self-view' : ''}${layout === 'quad' ? ' quad-view' : ''}${layout === 'kiva' ? ' kiva-view' : ''}${layout === 'triad' ? ' triad-view' : ''}${layout === 'dyad' ? ' dyad-view' : ''}`} style={gridStyle}>
      {tiles.map((p, i) => (
        <div
          className={`video-tile${layout === 'self' ? ' self-view-tile' : ''}${layout === 'quad' ? ' quad-view-tile' : ''}`}
          key={p.session_id || i}
          style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            minHeight: 0,
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          {p.tracks?.video?.state === 'playable' && p.tracks?.video?.persistentTrack ? (
            <VideoTileWithFit participant={p} getObjectFit={getObjectFit} />
          ) : p.mockImage ? (
            <MockTileBackground image={p.mockImage} userName={p.user_name} />
          ) : (
            <div style={{ color: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222' }}>
              Waiting for video...
            </div>
          )}
          {showLabels && (
            <div style={{ position: 'absolute', bottom: 4, left: 4, right: 4, color: '#fff', background: 'rgba(0,0,0,0.5)', fontSize: 14, borderRadius: 4, padding: '2px 6px', textAlign: 'center' }}>
              {p.user_name || p.userName || (p.local ? 'You' : 'Participant')}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // CRITICAL: Handle community layout with experimental integration
  if (layout === 'community') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <LoopMagnifier 
          isActive={isLoopActive} 
          magnification={2.5} 
          size={200}
          participantArray={magnifierParticipantArray}
          feedSize={magnifierFeedSize}
        >
          {({ centerMousePosition, scrollPosition, isMagnifierActive, magnifierSize, forceUpdate, onCenterParticipantChange }) => (
            experimentalMode ? (
              <CommunityViewExperimental 
                participants={participants} 
                viewMode={layout}
                showLabels={labelsVisible}
                centerMousePosition={centerMousePosition}
                scrollPosition={scrollPosition}
                isMagnifierActive={isMagnifierActive}
                magnifierSize={magnifierSize}
                forceUpdate={forceUpdate}
                onCenterParticipantChange={onCenterParticipantChange}
                onParticipantArrayReady={handleParticipantArrayReady}
              />
            ) : (
              <CommunityViewDebug 
                participants={participants} 
                viewMode={layout}
                showLabels={labelsVisible}
              />
            )
          )}
        </LoopMagnifier>
      </div>
    );
  }

  // Handle fishbowl layout
  if (layout === 'fishbowl') {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative' }}>
        <FishbowlView 
          participants={participants}
          selectedParticipants={selectedParticipants}
          onParticipantSelect={onParticipantSelect}
        />
      </div>
    );
  }

  return <div className={`video-grid-wrapper ${layout}-view`}>{gridElement}</div>;
};

// Helper component to dynamically set object-fit for both video and mock image
const VideoTileWithFit = ({ participant, getObjectFit, isMock }) => {
  const ref = React.useRef(null);
  const [objectFit, setObjectFit] = React.useState('cover');

  React.useEffect(() => {
    if (!ref.current) return;
    setObjectFit(getObjectFit(ref.current));
    const handleResize = () => setObjectFit(getObjectFit(ref.current));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getObjectFit]);

  React.useEffect(() => {
    if (!isMock && ref.current && participant.tracks?.video?.persistentTrack) {
      ref.current.srcObject = new window.MediaStream([participant.tracks.video.persistentTrack]);
    }
  }, [participant, isMock]);

  if (isMock) {
    return (
      <img
        ref={ref}
        src={participant.mockImage}
        alt={participant.user_name}
        style={{ width: '100%', height: '100%', objectFit, background: '#222', display: 'block' }}
      />
    );
  }
  return (
    <video
      autoPlay
      playsInline
      muted={participant.local}
      ref={(el) => {
        ref.current = el;
        if (el && participant.tracks?.video?.persistentTrack) {
          el.srcObject = new window.MediaStream([participant.tracks.video.persistentTrack]);
          
          // Force cover behavior to prevent letterboxing
          const enforceVideoCover = () => {
            if (el && el.parentElement) {
              const container = el.parentElement;
              const containerRect = container.getBoundingClientRect();
              // eslint-disable-next-line no-unused-vars
              const videoAspectRatio = el.videoWidth / el.videoHeight;
              // eslint-disable-next-line no-unused-vars
              const containerAspectRatio = containerRect.width / containerRect.height;
              
              // Always use cover to crop video instead of letterboxing
              el.style.width = '100%';
              el.style.height = '100%';
              el.style.objectFit = 'cover';
              el.style.objectPosition = 'center';
              el.style.position = 'absolute';
              el.style.top = '0';
              el.style.left = '0';
            }
          };
          
          // Add ResizeObserver to dynamically enforce cover behavior
          if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(entries => {
              enforceVideoCover();
            });
            
            const container = el.parentElement;
            if (container) {
              resizeObserver.observe(container);
            }
            
            // Initial enforcement
            setTimeout(enforceVideoCover, 100);
            
            return () => resizeObserver.disconnect();
          }
          
          // Fallback enforcement
          setTimeout(enforceVideoCover, 100);
        }
      }}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%', 
        height: '100%', 
        objectFit: 'cover',
        objectPosition: 'center',
        background: '#000', 
        display: 'block',
        transform: 'scale(1)',
        transformOrigin: 'center'
      }}
    />
  );
};

// New: Mock tile as background image div
const MockTileBackground = ({ image, userName }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      background: image ? `url(${image}) center center / cover no-repeat, #222` : '#222',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      zIndex: 1,
      backgroundSize: 'cover',
    }}
    aria-label={userName}
  />
);

export default VideoGrid; 