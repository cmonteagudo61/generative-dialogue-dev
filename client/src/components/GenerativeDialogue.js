import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useVideo } from './VideoProvider';
import VideoGrid from './video/VideoGrid';
// import AudioStreamer from './AudioStreamer'; // TEMPORARILY DISABLED TO FIX WEBSOCKET STORM
import LiveAIInsights from './LiveAIInsights';
import AIVideoControls from './AIVideoControls';
import { roomManager } from '../services/RoomManager';
import '../App.css';

// Helper to extract clean display name - prioritize actual session participant names
const getCleanDisplayName = (userName) => {
  if (!userName) return 'Participant';
  // Extract original name from format: "OriginalName_timestamp_sessionId"
  const parts = userName.split('_');
  if (parts.length >= 3) {
    return parts[0]; // Return the original name (Carlos, Ruth, Test1, Test2)
  }
  return userName;
};

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
  const joinAttemptsRef = useRef(0);
  const maxJoinAttempts = 3;
  const lastJoinAttemptRef = useRef(0);

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

  // Robust host detection for this tab
  const isThisTabHost = useCallback((sData) => {
    if (!sData) return false;
    const storedName = (sessionStorage.getItem('gd_current_participant_name') || '').trim();
    const hostParticipant = sData.participants?.find(p => p.isHost);
    const hostName = (sData.hostName || hostParticipant?.name || '').trim();
    if (!storedName) return false;
    const a = storedName.toLowerCase();
    const b = hostName.toLowerCase();
    const bFirst = b.split(' ')[0] || b;
    return (
      a === b ||
      b.startsWith(a) ||
      a.startsWith(bFirst) ||
      b.includes(a)
    );
  }, []);
  // Determine layout based on session phase and room assignment
  const layout = useMemo(() => {
    // ZOOM-LIKE BEHAVIOR: Check session phase first
    if (sessionData?.currentPhase === 'main-room' || sessionData?.status === 'main-room-active') {
      console.log('🏛️ Main room phase: Using community layout for everyone');
      return 'community';
    }
    
    // Use room type from assignment to determine layout (for breakout phases)
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
  }, [roomAssignment, hasJoinedRoom, sessionData?.currentPhase, sessionData?.status]);
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
      const storedParticipantName = sessionStorage.getItem('gd_current_participant_name');
      if (Math.random() < 0.05) { // Only log 5% of the time
        console.log('🔍 GenerativeDialogue: Looking for participant:', storedParticipantName);
        console.log('🔍 GenerativeDialogue: Available participants:', sessionData.participants?.map(p => ({name: p.name, id: p.id})));
        console.log('🔍 GenerativeDialogue: sessionStorage gd_current_participant_name:', storedParticipantName);
      }
      
      // Try to find participant by stored name first
      let currentParticipant = sessionData.participants?.find(p => 
        p.name === storedParticipantName
      );
      
      // Fallback 1: match by case-insensitive prefix (handles "Carlos" vs "Carlos Monteagudo")
      if (!currentParticipant && storedParticipantName) {
        const spLower = storedParticipantName.toLowerCase();
        currentParticipant = sessionData.participants?.find(p =>
          p.name?.toLowerCase().startsWith(spLower)
        );
        if (currentParticipant?.name) {
          // Normalize this tab to the full participant name
          sessionStorage.setItem('gd_current_participant_name', currentParticipant.name);
        }
      }
      
      // Fallback 2: if still not found and this tab is the host (by hostName), pick the host participant
      if (!currentParticipant && sessionData.hostName) {
        const host = sessionData.participants?.find(p => p.isHost) ||
                     sessionData.participants?.find(p => p.name === sessionData.hostName);
        const storedLower = (storedParticipantName || '').toLowerCase();
        const hostLower = (sessionData.hostName || host?.name || '').toLowerCase();
        if (host && (storedLower && hostLower.startsWith(storedLower))) {
          currentParticipant = host;
          sessionStorage.setItem('gd_current_participant_name', host.name);
        }
      }
      
      // If not found by stored name, try to find by session data currentParticipant
      if (!currentParticipant && sessionData.currentParticipant) {
        currentParticipant = sessionData.currentParticipant;
        console.log('🔍 GenerativeDialogue: Using currentParticipant from sessionData:', currentParticipant);
        // Update localStorage to match
        if (currentParticipant.name) {
          sessionStorage.setItem('gd_current_participant_name', currentParticipant.name);
          console.log('🔧 GenerativeDialogue: Updated sessionStorage participant name to:', currentParticipant.name);
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

  // Create main room for session when needed
  const createMainRoomForSession = useCallback(async () => {
    if (!sessionData) return;
    // Only the host is allowed to create the main room
    try {
      const myName = sessionStorage.getItem('gd_current_participant_name');
      const me = sessionData.participants?.find(p => p.name === myName);
      const isHost = !!(me?.isHost || (sessionData?.hostName && sessionData.hostName === myName));
      if (!isHost) {
        console.log('🔒 Non-host will not create main room. Waiting for host assignments...');
        return;
      }
    } catch (_) {}
    
    console.log('🏛️ Creating main room via Netlify function for session:', sessionData.sessionId);
    
    try {
      const allParticipants = sessionData.participants || [];
      const resp = await fetch('/.netlify/functions/daily-create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCode: `${sessionData.sessionId}-main-${Date.now()}`,
          participantCount: allParticipants.length || 16
        })
      });
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        throw new Error(`Netlify daily-create-room failed: ${resp.status} ${text}`);
      }
      const data = await resp.json();
      const created = data.room || data;
      const mainRoomName = created.name || created.id;
      const mainRoomUrl = created.url;
      if (!mainRoomUrl) throw new Error('Netlify daily-create-room returned no URL');

      // Build roomAssignments for MAIN for all participants
      const assignments = {
        sessionId: sessionData.sessionId,
        rooms: {
          main: {
            id: 'main',
            name: mainRoomName,
            url: mainRoomUrl,
            type: 'community',
            participants: allParticipants.map(p => p.id),
            sessionId: sessionData.sessionId,
            assignedAt: new Date().toISOString()
          }
        },
        participants: {}
      };

      allParticipants.forEach(p => {
        assignments.participants[p.id] = {
          participantId: p.id,
          participantName: p.name,
          roomId: 'main',
          roomName: mainRoomName,
          roomUrl: mainRoomUrl,
          roomType: 'community',
          assignedAt: new Date().toISOString()
        };
      });

      // Update session data with the main room assignment
      const updatedSession = {
        ...sessionData,
        roomAssignments: assignments,
        status: 'main-room-active',
        currentPhase: 'main-room'
      };

      localStorage.setItem(`session_${sessionData.sessionId}`, JSON.stringify(updatedSession));
      
      // Notify all participants
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: { sessionCode: sessionData.sessionId, sessionData: updatedSession }
      }));

      console.log('✅ Main room created successfully via Netlify:', assignments.rooms?.main);
      
    } catch (error) {
      console.error('❌ Failed to create main room via Netlify:', error);
      // Do not join any fallback room; wait for a valid assignment
    }
  }, [sessionData]);

  // ZOOM-LIKE: Auto-join room based on session phase
  useEffect(() => {
    const currentParticipant = sessionData?.participants?.find(p => 
      p.name === sessionStorage.getItem('gd_current_participant_name')
    );
    const thisTabIsHost = isThisTabHost(sessionData) || !!currentParticipant?.isHost;
    
    // PHASE 1: Everyone joins main room when session starts
    if (sessionData?.status === 'main-room-active' && !hasJoinedRoom && !isJoining && !joinAttempted) {
      console.log('🏛️ Session started: Everyone joining main room together');
      
      // Check if main room already exists in session data
      const existingMainRoom = sessionData?.roomAssignments?.rooms?.['main'];
      if (existingMainRoom) {
        console.log('🏛️ Using existing main room from session data:', existingMainRoom);
        const mainRoomAssignment = sessionData.roomAssignments?.participants?.[currentParticipant?.id] || {
          participantId: currentParticipant?.id || 'unknown',
          participantName: currentParticipant?.name || sessionStorage.getItem('gd_current_participant_name'),
          roomId: 'main',
          roomName: existingMainRoom.name,
          roomUrl: existingMainRoom.url,
          roomType: 'community',
          assignedAt: new Date().toISOString()
        };
        setRoomAssignment(mainRoomAssignment);
        setJoinAttempted(true);
      } else {
        console.log('🏛️ No main room found in session data, creating one via API...');
        // Create main room via API if it doesn't exist
        createMainRoomForSession();
      }
    }
    // PHASE 2a (HOST): When breakouts are assigned, host stays in main and should join it
    else if (sessionData?.status === 'rooms-assigned' && thisTabIsHost && !hasJoinedRoom && !isJoining && !joinAttempted) {
      const existingMainRoom = sessionData?.roomAssignments?.rooms?.['main'];
      const hostAssignment = sessionData?.roomAssignments?.participants?.[currentParticipant?.id];
      const mainAssignment = hostAssignment || (existingMainRoom ? {
        participantId: currentParticipant?.id || 'host',
        participantName: currentParticipant?.name || sessionStorage.getItem('gd_current_participant_name'),
        roomId: 'main',
        roomName: existingMainRoom.name,
        roomUrl: existingMainRoom.url,
        roomType: 'community',
        assignedAt: new Date().toISOString()
      } : null);
      if (mainAssignment) {
        console.log('🏛️ Host during breakouts: joining/staying in main room');
        setRoomAssignment(mainAssignment);
        setJoinAttempted(true);
      }
    }
    // PHASE 2: Join assigned breakout room (when host creates breakout rooms)
    else if (roomAssignment && !hasJoinedRoom && !isJoining && !joinAttempted && roomAssignment.roomName && sessionData?.status === 'rooms-assigned') {
      console.log('🎯 Auto-joining assigned breakout room:', {
        roomAssignment,
        hasJoinedRoom,
        isJoining,
        participantName: sessionStorage.getItem('gd_current_participant_name'),
        isHost: currentParticipant?.isHost,
        roomType: roomAssignment.roomType
      });
      joinAssignedRoom(roomAssignment);
    }
    // PHASE 3: Return to main room (when host ends breakout rooms)
    else if (sessionData?.status === 'main-room-active' && hasJoinedRoom && roomAssignment?.roomType !== 'community') {
      console.log('🏛️ Returning to main room from breakout room');
      
      // Use existing main room from session data
      const existingMainRoom = sessionData?.roomAssignments?.rooms?.['main'];
      if (existingMainRoom) {
        const mainRoomAssignment = {
          participantId: currentParticipant?.id || 'unknown',
          participantName: currentParticipant?.name || sessionStorage.getItem('gd_current_participant_name'),
          roomId: 'main',
          roomName: existingMainRoom.name,
          roomUrl: existingMainRoom.url,
          roomType: 'community',
          assignedAt: new Date().toISOString()
        };
        setRoomAssignment(mainRoomAssignment);
        setJoinAttempted(false); // Allow rejoining
        setHasJoinedRoom(false); // Reset to allow new room join
      }
    }
  }, [sessionData?.sessionId, sessionData?.status]); // Reduced deps - only essential session state changes

  const joinAssignedRoom = useCallback(async (currentRoomAssignment) => {
    // Use passed parameter or current state
    const assignment = currentRoomAssignment || roomAssignment;
    
    // ULTRA-AGGRESSIVE circuit breaker: prevent runaway join attempts
    if (!assignment) {
      console.log('🚨 joinAssignedRoom called with null assignment - preventing runaway attempts');
      return;
    }
    
    // Time-based circuit breaker
    const now = Date.now();
    if (now - lastJoinAttemptRef.current < 5000) { // 5 second cooldown
      console.log('🚨 CIRCUIT BREAKER: Join attempt too soon, enforcing 5-second cooldown');
      return;
    }
    
    // Attempt-based circuit breaker
    if (joinAttemptsRef.current >= maxJoinAttempts) {
      console.error('🚨 CIRCUIT BREAKER: Max join attempts reached, stopping all join attempts');
      return;
    }
    
    joinAttemptsRef.current++;
    lastJoinAttemptRef.current = now;
    
    console.log(`🔍 GenerativeDialogue: joinAssignedRoom attempt ${joinAttemptsRef.current}/${maxJoinAttempts}:`, assignment);
    console.log('🔍 GenerativeDialogue: joinRoom function available:', !!joinRoom);
    console.log('🔍 GenerativeDialogue: isConnected:', isConnected);
    console.log('🔍 GenerativeDialogue: hasJoinedRoom:', hasJoinedRoom);
    console.log('🔍 GenerativeDialogue: roomAssignment details:', {
      roomName: assignment?.roomName,
      roomUrl: assignment?.roomUrl,
      roomType: assignment?.roomType,
      participantName: assignment?.participantName
    });
    
    // CRITICAL DEBUG: Check if this participant should be joining
    const myParticipantName = sessionStorage.getItem('gd_current_participant_name');
    console.log('🚨 PARTICIPANT JOIN DEBUG:', {
      myStoredName: myParticipantName,
      assignmentName: assignment?.participantName,
      shouldJoin: myParticipantName === assignment?.participantName,
      roomUrl: assignment?.roomUrl
    });
    
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
    let roomUrl = assignment?.roomUrl;
    if (!roomUrl && assignment?.roomName) {
      // Generate Daily.co URL from room name
      roomUrl = `https://generativedialogue.daily.co/${assignment.roomName}`;
      console.log('🔧 GenerativeDialogue: Generated roomUrl from roomName:', roomUrl);
    }
    
    if (!roomUrl) {
      console.log('🏠 GenerativeDialogue: No room assignment available yet');
      console.log('🔍 GenerativeDialogue: roomAssignment keys:', Object.keys(assignment || {}));
      console.log('🔍 GenerativeDialogue: roomUrl value:', assignment?.roomUrl);
      console.log('🔍 GenerativeDialogue: roomName value:', assignment?.roomName);
      setIsJoining(false);
      return;
    }

    try {
      console.log('🎥 GenerativeDialogue: Joining assigned Daily.co room:', roomUrl);
      console.log('🔍 GenerativeDialogue: Video context available:', !!joinRoom);
      console.log('🔍 GenerativeDialogue: Room assignment details:', assignment);
      
      // Leave current room if connected
      if (isConnected && callObject) {
        console.log('🔄 GenerativeDialogue: Leaving current room first');
        await leaveRoom();
        setHasJoinedRoom(false);
      }

      // ENHANCED: Join new room with proper participant identification
      // URL overrides for multi-tab testing on one device: ?name=Ruth or ?pid=participant_123
      const params = new URLSearchParams(window.location.search);
      const overrideId = params.get('pid') || params.get('id');
      const overrideName = params.get('name') || params.get('as');

      // PRIORITY: URL name → sessionStorage → assignment name
      let participantName = overrideName || sessionStorage.getItem('gd_current_participant_name') || assignment?.participantName || null;
      
      // Try to find participant by assignment ID (most reliable) for validation/userData
      let currentParticipant = sessionData.participants?.find(p => p.id === (overrideId || assignment.participantId));

      // If we still don't have a name, fall back to session participant
      if (!participantName && currentParticipant?.name) {
        participantName = currentParticipant.name;
      }

      // Final fallback: sessionStorage name without modification
      if (!participantName) {
        participantName = sessionStorage.getItem('gd_current_participant_name') || 'Participant';
        console.log('🎭 Using fallback participant name:', participantName);
      } else {
        console.log('🎭 Using assignment/session/override participant name:', participantName);
      }
      // Persist the resolved participant identity for THIS TAB ONLY (avoid cross-tab overwrites)
      try {
        sessionStorage.setItem('gd_current_participant_name', participantName);
        const resolvedParticipantId = currentParticipant?.id || assignment?.participantId || null;
        if (resolvedParticipantId) {
          sessionStorage.setItem('gd_current_participant_id', resolvedParticipantId);
        }
      } catch (e) {}
      console.log('🎥 GenerativeDialogue: Joining as:', participantName);
      console.log('🔍 GenerativeDialogue: Current participant data:', currentParticipant);
      
      console.log('🚨 ABOUT TO CALL joinRoom() with:', { roomUrl, participantName });
      await joinRoom(roomUrl, participantName);
      console.log('🚨 joinRoom() COMPLETED SUCCESSFULLY');
      setCurrentRoom(assignment);
      setHasJoinedRoom(true);
      
      console.log('✅ GenerativeDialogue: Successfully joined room:', assignment.roomName);
      console.log('🔍 GenerativeDialogue: Expected to join as:', participantName);
      console.log('🔍 GenerativeDialogue: Room URL:', assignment.roomUrl);
      console.log('🔍 GenerativeDialogue: Participant ID:', currentParticipant?.id);
      console.log('🔍 GenerativeDialogue: Room assignment participant ID:', assignment.participantId);
      
      // DEBUG: Check who else is supposed to be in this room
      if (sessionData?.roomAssignments?.rooms) {
        const myRoom = Object.values(sessionData.roomAssignments.rooms).find(room => 
          room.id === assignment.roomId || room.name === assignment.roomName
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
        
        // CRITICAL DEBUG: Check who should be joining this room
        console.log('🚨 ROOM JOINING ANALYSIS:');
        console.log('🔍 Total participants in session:', sessionData.participants?.length || 0);
        console.log('🔍 Total room assignments:', Object.keys(sessionData.roomAssignments.participants).length);
        console.log('🔍 Participants who should join this room:');
        Object.entries(sessionData.roomAssignments.participants).forEach(([participantId, assignment]) => {
          const participant = sessionData.participants?.find(p => p.id === participantId);
          console.log(`  - ${participant?.name || 'Unknown'} (${participantId}) should join: ${assignment.roomUrl}`);
        });
      }
      
      // CRITICAL DEBUG: Show what room URL I'm actually joining
      console.log('🚨 CRITICAL: About to join room URL:', assignment?.roomUrl);
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
  }, []); // Stable - uses refs and state setters which are stable

  // Separate useEffect to join room when roomAssignment is set
  useEffect(() => {
    if (roomAssignment && roomAssignment.roomName && !hasJoinedRoom && !isJoining) {
      console.log('🏛️ Room assignment detected, attempting to join:', roomAssignment);
      joinAssignedRoom(roomAssignment); // Pass current roomAssignment
    }
  }, [roomAssignment?.roomName, hasJoinedRoom, isJoining]); // Removed joinAssignedRoom to prevent circular deps

  // Return to main Community View room
  const returnToMainRoom = async () => {
    if (!sessionData?.roomAssignments?.rooms?.main || isJoining) return;
    
    setIsJoining(true);
    try {
      const participantName = sessionStorage.getItem('gd_current_participant_name');
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

  // ADDED: Host breakout room creation
  const handleCreateBreakoutRooms = useCallback(async (roomType) => {
    const participantName = sessionStorage.getItem('gd_current_participant_name');
    const currentParticipant = sessionData?.participants?.find(p => p.name === participantName);
    
    const isHost = isThisTabHost(sessionData) || !!currentParticipant?.isHost;
    
    console.log('🔍 Host check debug:', {
      participantName,
      currentParticipant,
      sessionHostName: sessionData?.hostName,
      isHost,
      sessionData: !!sessionData
    });
    
    if (!sessionData || !isHost) {
      console.log('❌ Only hosts can create breakout rooms');
      return;
    }

    console.log(`🏠 Host creating ${roomType} breakout rooms...`);
    
    try {
      // CRITICAL FIX: Get latest session data from localStorage to ensure we have all participants
      const latestSessionData = JSON.parse(localStorage.getItem(`session_${sessionData.sessionId}`) || '{}');
      const allParticipants = latestSessionData.participants || sessionData.participants || [];
      
      console.log('🔍 Room assignment debug:', {
        sessionDataParticipants: sessionData.participants?.length || 0,
        latestSessionParticipants: allParticipants.length,
        allParticipants: allParticipants.map(p => ({ name: p.name, isHost: p.isHost }))
      });
      
      // Get non-host participants for room assignment
      const participantsForRooms = allParticipants.filter(p => !p.isHost);
      
      if (participantsForRooms.length === 0) {
        alert(`No participants to assign to breakout rooms. Found ${allParticipants.length} total participants, ${allParticipants.filter(p => p.isHost).length} hosts.`);
        return;
      }

      // Create room assignments using the room manager
      const roomConfiguration = {
        roomType,
        allowRoomSwitching: true
      };

      // IMPORTANT: pass ALL participants so main room includes host; breakout logic excludes host
      const assignments = await roomManager.assignRoomsForSession(
        sessionData.sessionId,
        allParticipants,
        roomConfiguration
      );

      // Ensure host is explicitly assigned to main room if missing (safety for non-API path)
      const hostParticipant = allParticipants.find(p => p.isHost);
      if (hostParticipant && assignments.rooms?.main) {
        if (!assignments.participants[hostParticipant.id]) {
          assignments.participants[hostParticipant.id] = {
            participantId: hostParticipant.id,
            participantName: hostParticipant.name,
            roomId: 'main',
            roomName: assignments.rooms.main.name,
            roomUrl: assignments.rooms.main.url,
            roomType: 'community',
            assignedAt: new Date().toISOString()
          };
        }
      }

      // Update session data with room assignments
      const updatedSession = {
        ...sessionData,
        participants: allParticipants, // CRITICAL FIX: Use complete participant list
        roomAssignments: assignments,
        status: 'rooms-assigned', // Change status to trigger breakout room joining
        currentPhase: 'breakout-rooms',
        breakoutRoomsAvailable: true
      };

      localStorage.setItem(`session_${sessionData.sessionId}`, JSON.stringify(updatedSession));
      
      // Notify all participants of room assignments
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: { sessionCode: sessionData.sessionId, sessionData: updatedSession }
      }));

      console.log(`✅ Created ${roomType} breakout rooms:`, assignments);
      
    } catch (error) {
      console.error('❌ Failed to create breakout rooms:', error);
      alert(`Failed to create breakout rooms: ${error.message}`);
    }
  }, [sessionData]);

  // Host action: end breakouts and return everyone to main room
  const handleEndBreakouts = useCallback(() => {
    if (!sessionData) return;
    try {
      const latestSessionData = JSON.parse(localStorage.getItem(`session_${sessionData.sessionId}`) || 'null') || sessionData;
      const updatedSession = {
        ...latestSessionData,
        status: 'main-room-active',
        currentPhase: 'main-room'
      };
      localStorage.setItem(`session_${sessionData.sessionId}`, JSON.stringify(updatedSession));
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: { sessionCode: sessionData.sessionId, sessionData: updatedSession }
      }));
      console.log('🏛️ Breakouts ended. Returning everyone to main room.');
    } catch (e) {
      console.error('❌ Failed to end breakouts:', e);
    }
  }, [sessionData]);

  // ENHANCED: Consistent participant display logic across all clients (Memoized)
  const displayParticipants = useMemo(() => {
    // CONSISTENT LOGIC: Always prioritize real participants when available
    if (realParticipants.length > 0) {
      console.log('🎯 Connected to Daily.co room: Using real participants', {
        realCount: realParticipants.length,
        hasJoinedRoom,
        isConnected,
        participantNames: realParticipants.map(p => p.displayName || p.user_name || 'Unknown')
      });
      
      // Ensure we have proper display names for all real participants using session data
      const participantsWithNames = realParticipants.map((p, index) => {
        // Try to find the actual participant name from session data
        let actualName = null;
        
        // Strategy 1: Look for participant by userData if available
        if (p.userData?.originalName) {
          actualName = p.userData.originalName;
        } else if (p.userData?.displayName) {
          actualName = p.userData.displayName;
        }
        
        // Strategy 2: Look up by matching participant in session data
        if (!actualName && sessionData?.participants) {
          // Try to find participant by matching the base name from Daily.co username
          const dailyBaseName = p.user_name?.split('_')[0];
          const matchingParticipant = sessionData.participants.find(sp => 
            sp.name === dailyBaseName || 
            sp.name.toLowerCase() === dailyBaseName?.toLowerCase()
          );
          if (matchingParticipant) {
            actualName = matchingParticipant.name;
          }
        }
        
        // Strategy 3: For local participant, try per-tab sessionStorage
        if (!actualName && p.local) {
          actualName = sessionStorage.getItem('gd_current_participant_name');
        }
        
        // Fallback: use clean display name extraction
        const fallbackName = actualName || p.displayName || p.identity || getCleanDisplayName(p.user_name) || `Participant ${index + 1}`;
        
        return {
          ...p,
          displayName: fallbackName,
          identity: fallbackName,
          // Store original session name for reference
          sessionName: actualName
        };
      });
      
      return participantsWithNames;
    }
    
    // Fallback to mock participants when no real participants
    console.log('🎯 Using mock participants', {
      mockCount: participants.length,
      layout,
      sessionStatus: sessionData?.status
    });
    return participants;
  }, [realParticipants, participants, layout, sessionData?.status, hasJoinedRoom, isConnected]);
  
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

  // Host nav integration: listen for global events and route to server orchestrator
  useEffect(() => {
    const onHostCreate = (e) => {
      const rt = (e && e.detail && e.detail.roomType) ? String(e.detail.roomType) : 'dyad';
      console.log('[HostNav] create-breakouts event →', rt);
      if (rt === 'dyad') {
        handleNormalizeDyads();
      } else {
        handleCreateBreakoutRooms(rt);
      }
    };
    const onHostEnd = () => {
      console.log('[HostNav] end-breakouts event');
      handleEndBreakouts();
    };
    window.addEventListener('host-create-breakouts', onHostCreate);
    window.addEventListener('host-end-breakouts', onHostEnd);
    return () => {
      window.removeEventListener('host-create-breakouts', onHostCreate);
      window.removeEventListener('host-end-breakouts', onHostEnd);
    };
  }, [handleNormalizeDyads, handleCreateBreakoutRooms, handleEndBreakouts]);

  return (
    <React.Fragment>
      {/* Daily.co Video Integration - Show iframe when connected, fallback to VideoGrid */}
      {/* Video Grid with integrated Daily.co participants */}
      <VideoGrid 
        participants={displayParticipants} 
        layout={layout} 
        showLabels={realParticipants.length > 0 || layout !== 'community'} // Show labels when real participants are present 
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
          {isConnected
            ? `🎥 Live Video (${realParticipants.length} participants)`
            : hasJoinedRoom
              ? '🔄 Connecting to video...'
              : (sessionData?.status === 'main-room-active' || (sessionData?.status === 'rooms-assigned' && (isThisTabHost(sessionData))))
                ? '🏛️ Joining main room...'
                : '⏳ Waiting for room assignment...'}
          <br />
          Session: {sessionData.sessionId}
          <br />
          Participants: {sessionData.participants?.filter(p => !p.isHost).length || 0} + Host: {sessionData.participants?.filter(p => p.isHost).length || 0}
        </div>
      )}

      {/* ADDED: Host Breakout Room Controls */}
      {(() => {
        const participantName = sessionStorage.getItem('gd_current_participant_name');
        const currentParticipant = sessionData?.participants?.find(p => p.name === participantName);
        
        // Robust host detection using helper
        const isHost = isThisTabHost(sessionData) || !!currentParticipant?.isHost;
        const status = sessionData?.status;
        
        // Reduced logging frequency for host controls debug
        if (Math.random() < 0.01) { // Log only 1% of the time
          console.log('🏠 Host Controls Debug:', {
            sessionData: !!sessionData,
            participantName,
            isHost,
            status,
            shouldShow: sessionData && isHost && (status === 'main-room-active' || status === 'rooms-assigned')
          });
        }
        
        return sessionData && isHost && (status === 'main-room-active' || status === 'rooms-assigned');
      })() && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '20px',
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: '200px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>🏠 Host Controls</h4>
          <button
            onClick={() => handleCreateBreakoutRooms('dyad')}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              margin: '5px 0',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🎯 Create Dyad Rooms (2 people)
          </button>
          <button
            onClick={() => handleCreateBreakoutRooms('triad')}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              margin: '5px 0',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🎯 Create Triad Rooms (3 people)
          </button>
          <button
            onClick={() => handleCreateBreakoutRooms('quad')}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              margin: '5px 0',
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🎯 Create Quad Rooms (4 people)
          </button>
          <button
            onClick={handleEndBreakouts}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              margin: '10px 0 0 0',
              backgroundColor: '#e53935',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔁 End Breakouts (Return All)
          </button>
        </div>
      )}

      {/* Return to Main Room Button - Only show for participants in breakout rooms */}
      {sessionData && roomAssignment && currentRoom && 
       currentRoom.roomId !== 'main' && 
       !sessionData.participants?.find(p => p.name === sessionStorage.getItem('gd_current_participant_name'))?.isHost && (
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
      
      {error && !isConnected && <div style={{ color: 'red', padding: 8 }}>{error}</div>}
    </React.Fragment>
  );
};

const GenerativeDialogue = (props) => <GenerativeDialogueInner {...props} />;

export default GenerativeDialogue;
