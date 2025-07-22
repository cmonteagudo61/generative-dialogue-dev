import React, { useState, useMemo } from 'react';
import { useVideo } from './VideoProvider';
import VideoGrid from './video/VideoGrid';
import AppLayout from './AppLayout';
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
      return 'dyad'; // Default to dyad for this page
  }
};

const ConnectDyadPageInner = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {
  // Start with dyad view for Connect stage
  const [activeView, setActiveView] = useState('2'); // Dyad view
  // Pre-select 2 participants for dyad demo
  const [selectedParticipants, setSelectedParticipants] = useState([
    'mock-1', 'mock-2'
  ]);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const { participants, realParticipants, error } = useVideo();
  const layout = getLayoutFromView(activeView);
  const participantCount = useMemo(() => realParticipants.length, [realParticipants]);

  const handleViewChange = (newView) => setActiveView(newView);
  
  const handleParticipantSelect = (participant) => {
    // Toggle selection for dyads
    setSelectedParticipants(prev => 
      prev.includes(participant.session_id) 
        ? prev.filter(id => id !== participant.session_id)
        : [...prev, participant.session_id]
    );
  };

  const handleLoopToggle = (isActive) => {
    console.log('🔄 Loop toggle called:', { isActive, currentState: isLoopActive });
    setIsLoopActive(isActive);
    console.log('✅ Loop state updated to:', isActive);
  };

  return (
    <AppLayout
      activeSize={activeView}
      viewMode={layout}
      onSizeChange={handleViewChange}
      participantCount={participantCount}
      onLoopToggle={handleLoopToggle}
      developmentMode={developmentMode}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onBack={onBack}
      onForward={onForward}
      currentPage={currentPage}
      activeStage="connect" // Explicitly set CONNECT stage as active
      defaultActiveTab="catalyst" // Make Catalyst tab active (blue)
    >
      <VideoGrid 
        participants={participants} 
        layout={layout} 
        showLabels={layout !== 'community'} 
        selectedParticipants={selectedParticipants}
        onParticipantSelect={handleParticipantSelect}
        isLoopActive={isLoopActive}
      />
      {error && <div style={{ color: 'red', padding: 8 }}>{error}</div>}
    </AppLayout>
  );
};

const ConnectDyadPage = (props) => <ConnectDyadPageInner {...props} />;

export default ConnectDyadPage;
 