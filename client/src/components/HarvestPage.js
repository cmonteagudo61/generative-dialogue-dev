import React, { useState, useMemo, useEffect } from 'react';
import { useVideo } from './VideoProvider';
import VideoGrid from './video/VideoGrid';
import '../App.css';

const getLayoutFromView = (activeView) => {
  switch (String(activeView)) {
    case 'all':
      return 'community';
    case '6':
      return 'kiva';
    case '4':
      return 'quad';
    case '3':
      return 'triad';
    case '2':
      return 'dyad';
    case '1':
      return 'self';
    case 'fishbowl':
      return 'fishbowl';
    default:
      return 'community'; // Default to community view for harvest
  }
};

const HarvestPageInner = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode,
  activeSize,
  onSizeChange,
  isLoopActive = false
}) => {
  // Start with community view for HARVEST stage - final gathering
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  
  const { participants, realParticipants, error } = useVideo();
  const layout = getLayoutFromView(activeSize || 'all'); // Use activeSize prop or default to community
  const participantCount = useMemo(() => realParticipants.length, [realParticipants]);

  // Set community view as active when component mounts
  useEffect(() => {
    if (onSizeChange) {
      onSizeChange('all'); // Set to community view
    }
  }, [onSizeChange]);

  const handleParticipantSelect = (participant) => {
    setSelectedParticipants(prev => 
      prev.includes(participant.session_id) 
        ? prev.filter(id => id !== participant.session_id)
        : [...prev, participant.session_id]
    );
  };

  // Loop magnifier is controlled globally via props

  return (
    <>
      {/* Show community video feeds for final gathering */}
      <VideoGrid 
        layout={layout}
        participants={realParticipants}
        selectedParticipants={selectedParticipants}
        onParticipantSelect={handleParticipantSelect}
        isLoopActive={isLoopActive}
        developmentMode={developmentMode}
      />
      {error && <div style={{ color: 'red', padding: 8 }}>{error}</div>}
    </>
  );
};

const HarvestPage = (props) => <HarvestPageInner {...props} />;

export default HarvestPage;
