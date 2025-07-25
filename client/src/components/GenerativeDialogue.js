import React, { useState, useMemo } from 'react';
import { useVideo } from './VideoProvider';
import VideoGrid from './video/VideoGrid';
import VideoCallTranscription from './VideoCallTranscription';
import LiveAIInsights from './LiveAIInsights';
import AIVideoControls from './AIVideoControls';
import './VideoCallTranscription.css';
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

const GenerativeDialogueInner = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {
  // Start with community view to test loop
  const [activeView, setActiveView] = useState('all');
  // Pre-select 6 participants for fishbowl demo
  const [selectedParticipants, setSelectedParticipants] = useState([
    'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6'
  ]);
  const [isLoopActive, setIsLoopActive] = useState(false); // Reset for manual testing
  
  // AI Transcription state
  const [transcripts, setTranscripts] = useState([]);
  const [speakerMappings, setSpeakerMappings] = useState({});
  const [showTranscription, setShowTranscription] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [insightsMinimized, setInsightsMinimized] = useState(false);
  const [showAIControls, setShowAIControls] = useState(false);
  
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
  
  // AI Transcription event handlers
  const handleTranscriptUpdate = (transcriptData) => {
    console.log('📝 New transcript received:', transcriptData);
    
    // Only accumulate final transcripts for AI processing
    if (transcriptData.type === 'final' && transcriptData.text?.trim()) {
      console.log('📝 Adding final transcript for AI processing:', transcriptData.text);
      setTranscripts(prev => {
        const updated = [...prev, transcriptData.text.trim()];
        console.log('📝 Updated transcripts array:', updated);
        console.log('📝 Total transcripts for AI:', updated.length);
        return updated;
      });
    }
    
    // Also store the full transcript data for other uses
    // Legacy aiInsights removed - now handled by LiveAIInsights component
  };
  
  const handleSpeakerIdentified = (speakerData) => {
    console.log('👤 Speaker identified:', speakerData);
    setSpeakerMappings(prev => ({
      ...prev,
      [speakerData.speakerId]: speakerData.speakerName
    }));
  };
  
  const handleProcessTranscript = (processedData) => {
    console.log('🔬 Processed transcript data:', processedData);
    // This receives the processed AI insights from LiveAIInsights
  };
  
  // Legacy function removed - AI insights now handled by LiveAIInsights component
  
  const handleToggleAIInsights = () => {
    setInsightsMinimized(!insightsMinimized);
  };
  
  const handleMuteDetected = (muteData) => {
    console.log('🔇 Mute detection:', muteData);
    // Could update UI to show muted participants
  };
  
  const handleSpeakerFocused = (speakerData) => {
    console.log('🎯 Speaker focus:', speakerData);
    // Could update video layout to highlight active speaker
  };
  
  const handleControlAction = (action) => {
    console.log('🎛️ AI Control action:', action);
    // Could execute control actions like enabling turn-taking
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
    >
      <VideoGrid 
        participants={participants} 
        layout={layout} 
        showLabels={layout !== 'community'} 
        selectedParticipants={selectedParticipants}
        onParticipantSelect={handleParticipantSelect}
        isLoopActive={isLoopActive}
      />
      
      {/* Real-time AI Transcription Overlay */}
      {showTranscription && (
        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          left: '20px', 
          right: '20px', 
          zIndex: 1000,
          pointerEvents: 'auto'
        }}>
          <VideoCallTranscription
            onTranscriptUpdate={handleTranscriptUpdate}
            onSpeakerIdentified={handleSpeakerIdentified}
            showRealTimeTranscript={true}
            autoStartTranscription={true}
          />
        </div>
      )}
      
      {/* AI Video Controls */}
      {showAIControls && (
        <AIVideoControls
          onMuteDetected={handleMuteDetected}
          onSpeakerFocused={handleSpeakerFocused}
          onControlAction={handleControlAction}
          showAdvancedControls={true}
        />
      )}
      
      {/* Live AI Insights Overlay */}
      {showAIInsights && (
        <LiveAIInsights
          transcripts={transcripts}
          onProcessTranscript={handleProcessTranscript}
          position="right"
          minimized={insightsMinimized}
          onToggleMinimized={handleToggleAIInsights}
        />
      )}
      
      {error && <div style={{ color: 'red', padding: 8 }}>{error}</div>}
    </AppLayout>
  );
};

const GenerativeDialogue = (props) => <GenerativeDialogueInner {...props} />;

export default GenerativeDialogue; 