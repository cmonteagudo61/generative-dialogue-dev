import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useVideo } from './VideoProvider';
import VideoGrid from './video/VideoGrid';
// import AudioStreamer from './AudioStreamer'; // TEMPORARILY DISABLED TO FIX WEBSOCKET STORM
import LiveAIInsights from './LiveAIInsights';
import AIVideoControls from './AIVideoControls';
import { roomManager } from '../services/RoomManager';
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
  developmentMode,
  isLoopActive, // Receive this from App.js
  activeSize, // Add this prop for left navigation
  onSizeChange, // Add this prop for left navigation
  sessionData: propSessionData // Add sessionData prop from App.js
}) => {
  // Session integration state
  const [sessionData, setSessionData] = useState(propSessionData || null);
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  
  // Daily.co video integration state
  const { callObject, joinRoom, leaveRoom, isConnected, participants, realParticipants, error } = useVideo();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joinAttempted, setJoinAttempted] = useState(false);
  const [roomAssignment, setRoomAssignment] = useState(null);
  const videoContainerRef = useRef(null);

  // Use activeSize from props instead of internal state
  const [selectedParticipants, setSelectedParticipants] = useState([
    'mock-1', 'mock-2', 'mock-3', 'mock-4', 'mock-5', 'mock-6'
  ]);

  // AI Transcription state
  const [transcripts, setTranscripts] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [speakerMappings, setSpeakerMappings] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [showTranscription, setShowTranscription] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [insightsMinimized, setInsightsMinimized] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [showAIControls, setShowAIControls] = useState(false);
  // Determine layout based on room assignment and room type
  const layout = useMemo(() => {
    // Use room type from assignment to determine layout
    if (hasJoinedRoom && roomAssignment) {
      const roomType = roomAssignment.roomType;
      
      if (roomType === 'community') {
        console.log('🏛️ In Community View room: Using community layout');
        return 'community';
      } else if (roomType === 'dyad' || roomAssignment.roomName?.includes('dyad')) {
        console.log('🎯 In dyad breakout room: Using dyad layout');
        return 'dyad';
      } else if (roomType === 'triad' || roomAssignment.roomName?.includes('triad')) {
        console.log('🎯 In triad breakout room: Using triad layout');
        return 'triad';
      } else if (roomType === 'quad' || roomAssignment.roomName?.includes('quad')) {
        console.log('🎯 In quad breakout room: Using quad layout');
        return 'quad';
      } else if (roomType === 'kiva' || roomAssignment.roomName?.includes('kiva')) {
        console.log('🎯 In kiva breakout room: Using kiva layout');
        return 'kiva';
      }
    }
    
    // Fallback to community layout
    console.log('🎯 Fallback: Using community layout');
    return 'community';
  }, [roomAssignment, hasJoinedRoom]);
  // eslint-disable-next-line no-unused-vars
  const participantCount = useMemo(() => realParticipants.length, [realParticipants]);
  
  // ADDED: Update sessionData when propSessionData changes
  useEffect(() => {
    if (propSessionData) {
      console.log('🎯 GenerativeDialogue: Received session data from props:', propSessionData);
      setSessionData(propSessionData);
    }
  }, [propSessionData]);

  // ADDED: Load session data from URL parameters (fallback)
  useEffect(() => {
    if (!sessionData) {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('sessionId');
      
      if (sessionId) {
        console.log('🎯 GenerativeDialogue: Loading session data for:', sessionId);
        
        // Try to load session from localStorage
        const sessionKey = `session_${sessionId}`;
        const storedSession = localStorage.getItem(sessionKey);
        
        if (storedSession) {
          try {
            const parsedSession = JSON.parse(storedSession);
            setSessionData(parsedSession);
            console.log('🎯 GenerativeDialogue: Loaded session data:', parsedSession);
          } catch (error) {
            console.error('❌ Failed to parse session data:', error);
          }
        } else {
          console.log('🎯 GenerativeDialogue: No session data found for:', sessionId);
        }
      }
    }
  }, [sessionData]);
  
  // Get participant's room assignment
  useEffect(() => {
    // REDUCED LOGGING: Only log occasionally to prevent infinite loops
    if (Math.random() < 0.05) { // Only log 5% of the time
      console.log('🔍 GenerativeDialogue: useEffect triggered with sessionData:', sessionData?.sessionId);
    }
    if (sessionData?.sessionId) {
      const storedParticipantName = localStorage.getItem('gd_participant_name');
      if (Math.random() < 0.05) { // Only log 5% of the time
        console.log('🔍 GenerativeDialogue: Looking for participant:', storedParticipantName);
        console.log('🔍 GenerativeDialogue: Available participants:', sessionData.participants?.map(p => ({name: p.name, id: p.id})));
        console.log('🔍 GenerativeDialogue: localStorage gd_participant_name:', storedParticipantName);
        console.log('🔍 GenerativeDialogue: All localStorage keys:', Object.keys(localStorage).filter(k => k.includes('gd_') || k.includes('session_')));
      }
      
      // Try to find participant by stored name first
      let currentParticipant = sessionData.participants?.find(p => 
        p.name === storedParticipantName
      );
      
      // If not found by stored name, try to find by session data currentParticipant
      if (!currentParticipant && sessionData.currentParticipant) {
        currentParticipant = sessionData.currentParticipant;
        console.log('🔍 GenerativeDialogue: Using currentParticipant from sessionData:', currentParticipant);
        // Update localStorage to match
        if (currentParticipant.name) {
          localStorage.setItem('gd_participant_name', currentParticipant.name);
          console.log('🔧 GenerativeDialogue: Updated localStorage participant name to:', currentParticipant.name);
        }
      }
      
      console.log('🔍 GenerativeDialogue: Found current participant:', currentParticipant);
      
      if (currentParticipant) {
        // Check if session has room assignments in localStorage
        const sessionKey = `session_${sessionData.sessionId}`;
        const storedSession = localStorage.getItem(sessionKey);
        if (storedSession) {
          const session = JSON.parse(storedSession);
          console.log('🔍 GenerativeDialogue: Room assignments:', session.roomAssignments?.participants);
          console.log('🔍 GenerativeDialogue: Current participant ID:', currentParticipant.id);
          console.log('🔍 GenerativeDialogue: Available participant IDs:', Object.keys(session.roomAssignments?.participants || {}));
          
          // Try to find room assignment by participant ID first
          let assignment = session.roomAssignments?.participants[currentParticipant.id];
          if (assignment) {
            setRoomAssignment(assignment);
            setJoinAttempted(false); // Reset join attempt for new room
            console.log('🏠 GenerativeDialogue: Found room assignment by ID:', assignment);
            console.log('🎯 GenerativeDialogue: Room type detected from name:', assignment.roomName || assignment.roomId);
          } else {
            // FALLBACK: Try to find by participant name if ID lookup fails
            if (session.roomAssignments?.participants) {
              const assignmentByName = Object.values(session.roomAssignments.participants).find(assign => {
                // Get the participant from the original session data used for room assignments
                const originalParticipants = session.participants || [];
                const originalParticipant = originalParticipants.find(p => p.id === assign.participantId);
                return originalParticipant && originalParticipant.name === currentParticipant.name;
              });
              
              if (assignmentByName) {
                setRoomAssignment(assignmentByName);
                setJoinAttempted(false); // Reset join attempt for new room
                console.log('🏠 GenerativeDialogue: Found room assignment by name:', assignmentByName);
                console.log('🎯 GenerativeDialogue: Room type detected from name:', assignmentByName.roomName || assignmentByName.roomId);
              } else {
                console.log('🔍 GenerativeDialogue: No room assignment found for participant:', {
                  id: currentParticipant.id,
                  name: currentParticipant.name
                });
              }
            }
          }
        }
      } else {
        console.log('🔍 GenerativeDialogue: Current participant not found in session data');
      }
    }
  }, [sessionData]);

  // Auto-join assigned room (ALL participants including host join main room initially)
  useEffect(() => {
    const currentParticipant = sessionData?.participants?.find(p => 
      p.name === localStorage.getItem('gd_participant_name')
    );
    
    // EVERYONE (including host) joins their assigned room
    // Initially everyone is assigned to main Community View room
    if (roomAssignment && !hasJoinedRoom && !isJoining && !joinAttempted && roomAssignment.roomName) {
      console.log('🎯 Auto-joining assigned room:', {
        roomAssignment,
        hasJoinedRoom,
        isJoining,
        participantName: localStorage.getItem('gd_participant_name'),
        isHost: currentParticipant?.isHost,
        roomType: roomAssignment.roomType
      });
      joinAssignedRoom();
    }
  }, [roomAssignment?.roomName, hasJoinedRoom, isJoining, joinAttempted, sessionData?.sessionId]);

  const joinAssignedRoom = async () => {
    console.log('🔍 GenerativeDialogue: joinAssignedRoom called with:', roomAssignment);
    
    // CRITICAL: Set flags FIRST to prevent multiple calls
    setIsJoining(true);
    setJoinAttempted(true);
    
    // CRITICAL: Check if Daily.co call object is ready
    if (!joinRoom) {
      console.log('🚨 GenerativeDialogue: Daily.co not ready yet, will retry in 1 second...');
      setTimeout(() => {
        setIsJoining(false);
        setJoinAttempted(false); // Allow retry
      }, 1000);
      return;
    }
    
    // CRITICAL: Generate roomUrl from roomName if missing
    let roomUrl = roomAssignment?.roomUrl;
    if (!roomUrl && roomAssignment?.roomName) {
      // Generate Daily.co URL from room name
      roomUrl = `https://generativedialogue.daily.co/${roomAssignment.roomName}`;
      console.log('🔧 GenerativeDialogue: Generated roomUrl from roomName:', roomUrl);
    }
    
    if (!roomUrl) {
      console.log('🏠 GenerativeDialogue: No room assignment available yet');
      console.log('🔍 GenerativeDialogue: roomAssignment keys:', Object.keys(roomAssignment || {}));
      console.log('🔍 GenerativeDialogue: roomUrl value:', roomAssignment?.roomUrl);
      console.log('🔍 GenerativeDialogue: roomName value:', roomAssignment?.roomName);
      setIsJoining(false);
      return;
    }

    try {
      console.log('🎥 GenerativeDialogue: Joining assigned Daily.co room:', roomUrl);
      console.log('🔍 GenerativeDialogue: Video context available:', !!joinRoom);
      console.log('🔍 GenerativeDialogue: Room assignment details:', roomAssignment);
      
      // Leave current room if connected
      if (isConnected && callObject) {
        console.log('🔄 GenerativeDialogue: Leaving current room first');
        await leaveRoom();
        setHasJoinedRoom(false);
      }

      // Join new room with participant name
      const currentParticipant = sessionData.participants?.find(p => 
        p.name === localStorage.getItem('gd_participant_name')
      );
      const participantName = currentParticipant?.name || localStorage.getItem('gd_participant_name') || 'Participant';
      console.log('🎥 GenerativeDialogue: Joining as:', participantName);
      console.log('🔍 GenerativeDialogue: Current participant data:', currentParticipant);
      
      await joinRoom(roomUrl, participantName);
      setCurrentRoom(roomAssignment);
      setHasJoinedRoom(true);
      
      console.log('✅ GenerativeDialogue: Successfully joined room:', roomAssignment.roomName);
      console.log('🔍 GenerativeDialogue: Expected to join as:', participantName);
      console.log('🔍 GenerativeDialogue: Room URL:', roomAssignment.roomUrl);
      console.log('🔍 GenerativeDialogue: Participant ID:', currentParticipant?.id);
      console.log('🔍 GenerativeDialogue: Room assignment participant ID:', roomAssignment.participantId);
      
      // DEBUG: Check who else is supposed to be in this room
      if (sessionData?.roomAssignments?.rooms) {
        const myRoom = Object.values(sessionData.roomAssignments.rooms).find(room => 
          room.id === roomAssignment.roomId || room.name === roomAssignment.roomName
        );
        if (myRoom) {
          console.log('🏠 GenerativeDialogue: Room details:', {
            roomId: myRoom.id,
            roomName: myRoom.name,
            expectedParticipants: myRoom.participants,
            roomType: myRoom.type
          });
          
          // Show who should be in this room
          const expectedRoommates = myRoom.participants?.map(pid => {
            const p = sessionData.participants?.find(participant => participant.id === pid);
            return p ? `${p.name} (${pid})` : `Unknown (${pid})`;
          });
          console.log('🏠 GenerativeDialogue: Expected roommates:', expectedRoommates);
        }
      }
      
      // CRITICAL DEBUG: Show ALL room assignments to identify conflicts
      console.log('🚨 CRITICAL DEBUG - ALL ROOM ASSIGNMENTS:');
      if (sessionData?.roomAssignments?.participants) {
        Object.entries(sessionData.roomAssignments.participants).forEach(([participantId, assignment]) => {
          const participant = sessionData.participants?.find(p => p.id === participantId);
          console.log(`🔍 ${participant?.name || 'Unknown'} (${participantId}) → Room: ${assignment.roomName} (${assignment.roomUrl})`);
        });
      }
      
      // CRITICAL DEBUG: Show what room URL I'm actually joining
      console.log('🚨 CRITICAL: About to join room URL:', roomAssignment.roomUrl);
      console.log('🚨 CRITICAL: My participant ID:', currentParticipant?.id);
      console.log('🚨 CRITICAL: My name:', currentParticipant?.name);
      
    } catch (error) {
      console.error('❌ GenerativeDialogue: Failed to join room:', error);
      
      // If it's a call object initialization error, allow retry
      if (error.message && error.message.includes('Call object not initialized')) {
        console.log('🔄 GenerativeDialogue: Will retry join when Daily.co is ready...');
        setJoinAttempted(false); // Allow retry
      }
    } finally {
      setIsJoining(false);
    }
  };

  // Return to main Community View room
  const returnToMainRoom = async () => {
    if (!sessionData?.roomAssignments?.rooms?.main || isJoining) return;
    
    setIsJoining(true);
    try {
      const participantName = localStorage.getItem('gd_participant_name');
      const mainRoom = sessionData.roomAssignments.rooms.main;
      
      console.log('🏠 Returning to main Community View room:', mainRoom);
      
      // Leave current room and join main room
      if (isConnected && callObject) {
        console.log('🔄 Leaving current breakout room');
        await leaveRoom();
        setHasJoinedRoom(false);
      }
      
      // Join main room
      await joinRoom(mainRoom.roomUrl, participantName);
      setCurrentRoom(mainRoom);
      setHasJoinedRoom(true);
      
      console.log('✅ Successfully returned to main Community View room');
    } catch (error) {
      console.error('❌ Failed to return to main room:', error);
    } finally {
      setIsJoining(false);
    }
  };

  // No longer creating separate iframe - Daily.co participants are integrated into VideoGrid

  const handleParticipantSelect = useCallback((participant) => {
    // Toggle selection for fishbowl
    setSelectedParticipants(prev => 
      prev.includes(participant.session_id) 
        ? prev.filter(id => id !== participant.session_id)
        : [...prev, participant.session_id]
    );
  }, []);

  // SIMPLIFIED: Show real participants if connected to a room, otherwise show default mock participants
  const getParticipantsForDisplay = useCallback(() => {
    // If connected to Daily.co room, show real participants
    if (hasJoinedRoom && isConnected && realParticipants.length > 0) {
      console.log('🎯 Connected to Daily.co room: Using real participants');
      return realParticipants;
    }
    
    // Otherwise show default mock participants (including for host in empty community view)
    console.log('🎯 Not connected or no real participants: Using mock participants');
    return participants;
  }, [hasJoinedRoom, isConnected, realParticipants, participants]);
  
  // AI Transcription event handlers
  // eslint-disable-next-line no-unused-vars
  const handleTranscriptUpdate = useCallback((transcriptData) => {
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
  }, []);
  
  // eslint-disable-next-line no-unused-vars
  const handleSpeakerIdentified = useCallback((speakerData) => {
    console.log('👤 Speaker identified:', speakerData);
    setSpeakerMappings(prev => ({
      ...prev,
      [speakerData.speakerId]: speakerData.speakerName
    }));
  }, []);
  
  const handleProcessTranscript = useCallback((processedData) => {
    console.log('🔬 Processed transcript data:', processedData);
    // This receives the processed AI insights from LiveAIInsights
  }, []);
  
  // Legacy function removed - AI insights now handled by LiveAIInsights component
  
  const handleToggleAIInsights = useCallback(() => {
    setInsightsMinimized(!insightsMinimized);
  }, [insightsMinimized]);
  
  const handleMuteDetected = useCallback((muteData) => {
    console.log('🔇 Mute detection:', muteData);
    // Could update UI to show muted participants
  }, []);
  
  const handleSpeakerFocused = useCallback((speakerData) => {
    console.log('🎯 Speaker focus:', speakerData);
    // Could update video layout to highlight active speaker
  }, []);
  
  const handleControlAction = useCallback((action) => {
    console.log('🎛️ AI Control action:', action);
    // Could execute control actions like enabling turn-taking
  }, []);

  return (
    <React.Fragment>
      {/* Daily.co Video Integration - Show iframe when connected, fallback to VideoGrid */}
      {/* Video Grid with integrated Daily.co participants */}
      <VideoGrid 
        participants={getParticipantsForDisplay()} 
        layout={layout} 
        showLabels={layout !== 'community'} 
        selectedParticipants={selectedParticipants}
        onParticipantSelect={handleParticipantSelect}
        isLoopActive={isLoopActive}
        suppressMockParticipants={false} // Always allow mock participants for host community view
      />
      
      {/* ADDED: Session Status Indicator */}
      {sessionData && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: isConnected ? 'rgba(76, 175, 80, 0.9)' : hasJoinedRoom ? 'rgba(255, 152, 0, 0.9)' : 'rgba(158, 158, 158, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 1000
        }}>
          {isConnected ? `🎥 Live Video (${realParticipants.length} in room)` : hasJoinedRoom ? '🔄 Connecting to video...' : '⏳ Waiting for room assignment...'}
          <br />
          Session: {sessionData.sessionId}
          <br />
          Total Participants: {sessionData.participants?.length || 0}
        </div>
      )}

      {/* Return to Main Room Button - Only show for participants in breakout rooms */}
      {sessionData && roomAssignment && currentRoom && 
       currentRoom.roomId !== 'main' && 
       !sessionData.participants?.find(p => p.name === localStorage.getItem('gd_participant_name'))?.isHost && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <button
            onClick={returnToMainRoom}
            disabled={isJoining}
            style={{
              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: 'white',
              border: 'none',
              padding: '12px 20px',
              borderRadius: '25px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: isJoining ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(76, 175, 80, 0.3)',
              opacity: isJoining ? 0.6 : 1,
              transition: 'all 0.3s ease'
            }}
            onMouseOver={(e) => !isJoining && (e.target.style.transform = 'translateY(-2px)')}
            onMouseOut={(e) => !isJoining && (e.target.style.transform = 'translateY(0)')}
          >
            {isJoining ? '🔄 Returning...' : '🏠 Return to Community'}
          </button>
        </div>
      )}
      
      {/* <AudioStreamer
        isRecording={showTranscription}
        onTranscriptionUpdate={handleTranscriptUpdate}
        onSpeakerIdentified={handleSpeakerIdentified}
        onAIInsight={handleProcessTranscript}
      /> */}
      
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
    </React.Fragment>
  );
};

const GenerativeDialogue = (props) => <GenerativeDialogueInner {...props} />;

export default GenerativeDialogue;
