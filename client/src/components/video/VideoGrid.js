/* BACKUP FILE - VideoGrid.js - WORKING VERSION 2025
 * This is the MAIN UI coordinator file that handles all view modes:
 * - self, dyad, triad, quad, kiva, community
 * - Switches between CommunityViewExperimental and CommunityViewDebug
 * - Handles experimental mode state (removed toggle buttons)
 * - Critical for restoring complete UI functionality
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import './VideoGridLayout.css';
// eslint-disable-next-line no-unused-vars
import CommunityView from './CommunityView';
import CommunityViewExperimental from './CommunityViewExperimental';
import CommunityViewDebug from './CommunityViewDebug';
import FishbowlView from './FishbowlView';
import LoopMagnifier from './LoopMagnifier';
import VideoTile from './VideoTile';
import MockTile from './MockTile';

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

const VideoGrid = ({ participants: participantsProp = [], layout = 'self', showLabels = false, useExperimentalView = true, selectedParticipants = [], onParticipantSelect, isLoopActive = false }) => {
  const participants = React.useMemo(() => 
    Array.isArray(participantsProp) ? participantsProp : Object.values(participantsProp),
    [participantsProp]
  );
  // ALL HOOKS MUST BE AT THE TOP - before any conditional returns
  const [experimentalMode] = useState(useExperimentalView);
  const [labelsVisible] = useState(showLabels);
  const quadWrapperRef = useRef(null);
  const [quadGridWidth, setQuadGridWidth] = useState('100%');
  const [magnifierParticipantArray, setMagnifierParticipantArray] = useState([]);
  const [magnifierFeedSize, setMagnifierFeedSize] = useState(60);
  const [centerParticipantName, setCenterParticipantName] = useState(null);

  // FLICKERING FIX: Create a stable callback for onCenterParticipantChange
  const handleCenterParticipantChange = useCallback((name) => {
    setCenterParticipantName(name);
  }, []);

  // Callback to receive participant array from CommunityViewExperimental
  const handleParticipantArrayReady = useCallback((participantArray, feedSize) => {
    setMagnifierParticipantArray(participantArray);
    setMagnifierFeedSize(feedSize);
  }, []);

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
                <VideoTile participant={p} getObjectFit={getObjectFit} />
              ) : p.mockImage ? (
                <MockTile image={p.mockImage} userName={p.user_name} />
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
          className={`video-grid quad-view`}
          style={{
            width: '100%',
            height: '100%',
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
                <VideoTile participant={p} getObjectFit={getObjectFit} />
              ) : p.mockImage ? (
                <MockTile image={p.mockImage} userName={p.user_name} />
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
                <VideoTile participant={p} getObjectFit={getObjectFit} />
              ) : p.mockImage ? (
                <MockTile image={p.mockImage} userName={p.user_name} />
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
            <VideoTile participant={p} getObjectFit={getObjectFit} />
          ) : p.mockImage ? (
            <MockTile image={p.mockImage} userName={p.user_name} />
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
          {() => (
            experimentalMode ? (
              <CommunityViewExperimental 
                participants={participants} 
                viewMode={layout}
                showLabels={labelsVisible}
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

export default VideoGrid; 