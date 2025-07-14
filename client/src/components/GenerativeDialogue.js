import React, { useState, useMemo } from 'react';
import { VideoProvider, useVideo } from './VideoProvider';
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
      return 'community';
  }
};

const GenerativeDialogueInner = () => {
  // Start with community view to test loop
  const [activeView, setActiveView] = useState('all');
  // Pre-select 6 participants for fishbowl demo
  const [selectedParticipants, setSelectedParticipants] = useState([
    'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6'
  ]);
  const [isLoopActive, setIsLoopActive] = useState(false); // Reset for manual testing
  const { participants, realParticipants, error } = useVideo();
  const layout = getLayoutFromView(activeView);
  const participantCount = useMemo(() => realParticipants.length, [realParticipants]);

  const handleViewChange = (newView) => setActiveView(newView);
  
  const handleParticipantSelect = (participant) => {
    // Toggle selection for fishbowl
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

const GenerativeDialogue = () => (
  <VideoProvider>
    <GenerativeDialogueInner />
  </VideoProvider>
);

export default GenerativeDialogue; 