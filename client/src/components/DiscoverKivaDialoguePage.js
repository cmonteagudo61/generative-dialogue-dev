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
      return 'kiva'; // Default to kiva for this dialogue
  }
};

const DiscoverKivaDialoguePageInner = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {
  // Start with kiva view for DISCOVER stage dialogue
  const [activeView, setActiveView] = useState('6'); // KIVA view (6 participants)
  // Pre-select 6 participants for kiva demo
  const [selectedParticipants, setSelectedParticipants] = useState([
    'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6'
  ]);
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
      activeStage="discover" // DISCOVER stage is active
      defaultActiveTab="dialogue" // DIALOGUE tab is active
      dialogueQuestion="What unexpected connections do you notice emerging from our collective exploration of community resilience?"
      dialogueTimeframe="30 minutes"
      dialogueFormat="KIVA breakout groups"
      isDialogueActive={true}
      isKivaDialogue={true}
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

const DiscoverKivaDialoguePage = (props) => <DiscoverKivaDialoguePageInner {...props} />;

export default DiscoverKivaDialoguePage; 