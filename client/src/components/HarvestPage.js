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
  developmentMode
}) => {
  // Start with individual view for HARVEST stage
  const [activeView, setActiveView] = useState(1); // Individual view (makes icon blue)
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
      {/* Hide video feed for individual harvest activities */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', background: '#f5f5f5', color: '#666' }}>
        Individual Activity - No Video Feed Required
      </div>
      {error && <div style={{ color: 'red', padding: 8 }}>{error}</div>}
    </>
  );
};

const HarvestPage = (props) => <HarvestPageInner {...props} />;

export default HarvestPage;
