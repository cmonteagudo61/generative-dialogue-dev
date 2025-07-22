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
      return 'triad'; // Default to triad for this page
  }
};

const ExploreTriadSummaryPageInner = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {
  // Start with triad view for EXPLORE stage summary
  const [activeView, setActiveView] = useState('3'); // Triad view
  // Pre-select 3 participants for triad demo
  const [selectedParticipants, setSelectedParticipants] = useState([
    'mock-1', 'mock-2', 'mock-3'
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

  // Voting functionality is handled in BottomContentArea
  // This page just provides the layout and passes props

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
      activeStage="explore" // EXPLORE stage is active
      defaultActiveTab="summary" // SUMMARY tab is active
      dialogueQuestion="How can we better support community resilience in times of crisis?"
      dialogueTimeframe="20 minutes"
      dialogueFormat="TRIAD breakout rooms"
      isSummaryReview={true}
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

const ExploreTriadSummaryPage = (props) => <ExploreTriadSummaryPageInner {...props} />;

export default ExploreTriadSummaryPage; 