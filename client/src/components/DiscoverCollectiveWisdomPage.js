import React, { useState, useMemo } from 'react';
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
      return 'community'; // Default to community view for collective phase
  }
};

const DiscoverCollectiveWisdomPageInner = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {
  // Start with community view for collective wisdom phase
  const [activeView, setActiveView] = useState('all'); // Community view
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isLoopActive, setIsLoopActive] = useState(false);
  
  const { participants, realParticipants, error } = useVideo();
  const layout = getLayoutFromView(activeView);
  const participantCount = useMemo(() => realParticipants.length, [realParticipants]);

  const handleViewChange = (newView) => setActiveView(newView);
  
  const handleParticipantSelect = (participant) => {
    setSelectedParticipants(prev => 
      prev.includes(participant.session_id) 
        ? prev.filter(id => id !== participant.session_id)
        : [...prev, participant.session_id]
    );
  };

  const handleLoopToggle = (isActive) => {
    setIsLoopActive(isActive);
  };

  return (
    <>
      <VideoGrid 
        participants={participants} 
        layout={layout} 
        showLabels={layout !== 'community'} 
        selectedParticipants={selectedParticipants}
        onParticipantSelect={handleParticipantSelect}
        isLoopActive={isLoopActive}
      />
      {error && <div style={{ color: 'red', padding: 8 }}>{error}</div>}
    </>
  );
};

const DiscoverCollectiveWisdomPage = (props) => <DiscoverCollectiveWisdomPageInner {...props} />;

export default DiscoverCollectiveWisdomPage;
