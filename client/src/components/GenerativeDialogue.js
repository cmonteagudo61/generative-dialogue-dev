import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useVideo } from './VideoProvider';
import VideoGrid from './video/VideoGrid';
// import AudioStreamer from './AudioStreamer'; // TEMPORARILY DISABLED TO FIX WEBSOCKET STORM
import LiveAIInsights from './LiveAIInsights';
import AIVideoControls from './AIVideoControls';
import { roomManager } from '../services/RoomManager';
import { ROOM_POOL } from '../config/roomConfig';
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

  // Enforce tab identity from URL ?name= param so host tab is recognized as host
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlName = (params.get('name') || '').trim();
      if (urlName) {
        const ss = sessionStorage.getItem('gd_current_participant_name') || '';
        if (ss !== urlName) sessionStorage.setItem('gd_current_participant_name', urlName);
      }
    } catch (_) {}
  }, []);
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
      } else if (roomType === 'fishbowl' || roomAssignment.roomName?.includes('fishbowl')) {
        console.log('🎯 In fishbowl: Using fishbowl layout');
        return 'fishbowl';
      } else if (roomType === 'self' || roomAssignment.roomName?.includes('self')) {
        console.log('🎯 In individual reflection: Using self layout');
        return 'self';
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
      const sessionId = urlParams.get('session') || urlParams.get('sessionId');
      
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
      const storedParticipantName = (sessionStorage.getItem('gd_current_participant_name') || '').trim();
      if (Math.random() < 0.05) { // Only log 5% of the time
        console.log('🔍 GenerativeDialogue: Looking for participant:', storedParticipantName);
        console.log('🔍 GenerativeDialogue: Available participants:', sessionData.participants?.map(p => ({name: p.name, id: p.id})));
        console.log('🔍 GenerativeDialogue: localStorage gd_participant_name:', storedParticipantName);
        console.log('🔍 GenerativeDialogue: All localStorage keys:', Object.keys(localStorage).filter(k => k.includes('gd_') || k.includes('session_')));
      }
      
      // Always identify current tab by sessionStorage name (per-tab identity)
      const currentParticipant = sessionData.participants?.find(p => p.name === storedParticipantName);
      
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
          
          // Prefer assignment by NAME mapping to avoid cross-tab ID confusion
          let assignment = null;
          if (session.roomAssignments?.participants) {
            assignment = Object.values(session.roomAssignments.participants).find(assign => {
              const originalParticipants = session.participants || [];
              const originalParticipant = originalParticipants.find(p => p.id === assign.participantId);
              return originalParticipant && originalParticipant.name === currentParticipant.name;
            }) || null;
          }
          // Fallback to direct ID if name mapping not found
          if (!assignment) assignment = session.roomAssignments?.participants[currentParticipant.id] || null;
          if (assignment) {
            setRoomAssignment(assignment);
            setJoinAttempted(false);
            console.log('🏠 GenerativeDialogue: Using room assignment:', assignment);
          } else {
            console.log('🔍 GenerativeDialogue: No room assignment found for participant:', { id: currentParticipant.id, name: currentParticipant.name });
          }
        }
      } else {
        console.log('🔍 GenerativeDialogue: Current participant not found in session data');
      }
    }
  }, [sessionData]);

  // Listen for session updates (same-tab CustomEvent and cross-tab storage event)
  useEffect(() => {
    const onLocalEvent = (e) => {
      const next = (e && e.detail && e.detail.sessionData) || null;
      if (next && next.sessionId) {
        setSessionData(next);
        // Allow a fresh join attempt after assignments change
        setJoinAttempted(false);
      }
    };
    window.addEventListener('session-updated', onLocalEvent);

    const sid = sessionData?.sessionId || new URLSearchParams(window.location.search).get('session') || new URLSearchParams(window.location.search).get('sessionId');
    const storageKey = sid ? `session_${sid}` : null;
    const onStorage = (e) => {
      if (!storageKey) return;
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed && parsed.sessionId) setSessionData(parsed);
        } catch (_) {}
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('session-updated', onLocalEvent);
      window.removeEventListener('storage', onStorage);
    };
  }, [sessionData?.sessionId]);

  // Auto-join assigned room (ALL participants including host join main room initially)
  useEffect(() => {
    const storedName = (sessionStorage.getItem('gd_current_participant_name') || localStorage.getItem('gd_participant_name') || '').trim();
    const currentParticipant = sessionData?.participants?.find(p => 
      p.name === storedName
    );
    
    // Join main room if no assignment yet
    if (!roomAssignment && !hasJoinedRoom && !isJoining && !joinAttempted) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlSessionId = urlParams.get('session') || urlParams.get('sessionId') || sessionData?.sessionId;
      const main = sessionData?.roomAssignments?.rooms?.main || (urlSessionId ? { roomUrl: roomManager.getMainRoomUrl(urlSessionId), name: `${urlSessionId}-community-main` } : null);
      if (main?.roomUrl) {
        const participantName = storedName || currentParticipant?.name || 'Participant';
        console.log('🏛️ Auto-joining main room (no breakout assignment yet):', main);
        setIsJoining(true);
        setJoinAttempted(true);
        joinRoom(main.roomUrl, participantName)
          .then(() => {
            setCurrentRoom({ ...main, roomId: 'main', roomType: 'community' });
            setHasJoinedRoom(true);
          })
          .catch(async (e) => {
            console.error('❌ Failed to join main room:', e);
            const msg = String(e?.errorMsg || e?.message || '');
            if (msg.includes('does not exist') && typeof roomManager.createDailyRoom === 'function' && urlSessionId) {
              try {
                // Deterministic main room name so all tabs converge on the same room
                const created = await roomManager.createDailyRoom(`${urlSessionId}-community-main`, 'community');
                const storageKey = `session_${urlSessionId}`;
                const base = JSON.parse(localStorage.getItem(storageKey) || 'null') || sessionData || {};
                const assignments = base.roomAssignments || { rooms: {}, participants: {} };
                assignments.rooms = assignments.rooms || {};
                assignments.rooms.main = { id: created.id, name: created.name || created.id, url: created.url, type: 'community', participants: [] };
                // Assign EVERYONE to main when we first create it
                const allParticipants = Array.isArray(base.participants) ? base.participants : [];
                allParticipants.forEach(p => {
                  assignments.participants[p.id] = {
                    participantId: p.id,
                    roomId: 'main',
                    roomUrl: created.url,
                    roomName: created.name || created.id,
                    roomType: 'community',
                    assignedAt: new Date().toISOString()
                  };
                });
                assignments.rooms.main.participants = allParticipants.map(p => p.id);
                const updated = { ...base, roomAssignments: assignments, breakoutsActive: false, status: 'rooms-assigned' };
                localStorage.setItem(storageKey, JSON.stringify(updated));
                try { window.dispatchEvent(new CustomEvent('session-updated', { detail: { sessionCode: urlSessionId, sessionData: updated } })); } catch (_) {}
                try { window.dispatchEvent(new CustomEvent('gd-session-updated-local', { detail: { sessionId: urlSessionId, sessionData: updated } })); } catch (_) {}
                setSessionData(updated);
                // Immediately join the newly created main room
                const pn = (sessionStorage.getItem('gd_current_participant_name') || localStorage.getItem('gd_participant_name') || 'Participant').trim();
                await joinRoom(created.url, pn);
                setCurrentRoom({ id: 'main', roomId: 'main', roomType: 'community', roomUrl: created.url, name: created.name });
                setHasJoinedRoom(true);
                setJoinAttempted(false);
              } catch (err) {
                console.warn('Failed to auto-create main room:', err);
              }
            }
          })
          .finally(() => setIsJoining(false));
        return;
      }
    }

    // Only non-hosts auto-join breakouts; host stays in community unless assigned to main/community
    if (roomAssignment && !hasJoinedRoom && !isJoining && !joinAttempted && roomAssignment.roomName) {
      // Gate breakouts on flag; allow joining MAIN even when inactive
      if (!sessionData?.breakoutsActive) {
        const isCommunityAssignment = (roomAssignment.roomId === 'main') ||
          (roomAssignment.roomName && (roomAssignment.roomName.includes('community') || roomAssignment.roomName.includes('main')));
        if (!isCommunityAssignment) {
          // Force-join main when breakouts are inactive
          const urlParams = new URLSearchParams(window.location.search);
          const urlSessionId = urlParams.get('session') || urlParams.get('sessionId') || sessionData?.sessionId;
          const main = sessionData?.roomAssignments?.rooms?.main || (urlSessionId ? { roomUrl: roomManager.getMainRoomUrl(urlSessionId), name: `${urlSessionId}-community-main` } : null);
          if (main?.roomUrl) {
            const participantName = (sessionStorage.getItem('gd_current_participant_name') || localStorage.getItem('gd_participant_name') || 'Participant').trim();
            setIsJoining(true);
            setJoinAttempted(true);
            joinRoom(main.roomUrl, participantName)
              .then(() => {
                setCurrentRoom({ ...main, roomId: 'main', roomType: 'community' });
                setHasJoinedRoom(true);
              })
              .catch(() => {})
              .finally(() => setIsJoining(false));
          }
          return;
        }
      }
      const params = new URLSearchParams(window.location.search);
      const urlNameLc = (params.get('name') || '').trim().toLowerCase();
      const isHostMe = !!(
        currentParticipant?.isHost ||
        (sessionData?.hostName && urlNameLc && sessionData.hostName.toLowerCase() === urlNameLc)
      );
      const isCommunityAssignment = (roomAssignment.roomId === 'main') ||
        (roomAssignment.roomName && (roomAssignment.roomName.includes('community') || roomAssignment.roomName.includes('main')));
      if (isHostMe && !isCommunityAssignment) {
        console.log('🛑 Host detected; preventing auto-join to breakout. Staying in community.');
        return;
      }
      console.log('🎯 Auto-joining assigned room:', {
        roomAssignment,
        hasJoinedRoom,
        isJoining,
        participantName: (sessionStorage.getItem('gd_current_participant_name') || localStorage.getItem('gd_participant_name') || '').trim(),
        isHost: currentParticipant?.isHost,
        roomType: roomAssignment.roomType
      });
      joinAssignedRoom();
    }
  }, [roomAssignment?.roomName, hasJoinedRoom, isJoining, joinAttempted, sessionData?.sessionId]);

  // When a new assignment arrives, switch rooms even if already connected
  useEffect(() => {
    if (!roomAssignment) return;
    const targetIsMain = (roomAssignment.roomId === 'main') || (roomAssignment.roomName && roomAssignment.roomName.includes('community'));
    const currentIsMain = (currentRoom?.roomId === 'main') || (currentRoom?.roomType === 'community');

    // Identify if this tab is the host
    const storedName = (sessionStorage.getItem('gd_current_participant_name') || localStorage.getItem('gd_participant_name') || '').trim();
    const me = sessionData?.participants?.find(p => p.name === storedName);
    const isHostMe = !!(me && me.isHost) || (sessionData?.hostName && me && me.name && sessionData.hostName.toLowerCase() === me.name.toLowerCase());

    if (targetIsMain && !currentIsMain) {
      // Move back to main
      returnToMainRoom();
    } else if (!targetIsMain && currentIsMain) {
      // Move from main to breakout (non-hosts only)
      if (!isHostMe) {
        // Allow re-join even if already connected
        setJoinAttempted(false);
        joinAssignedRoom();
      }
    }
  }, [roomAssignment?.roomId, roomAssignment?.roomName, currentRoom?.roomId, currentRoom?.roomType]);

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
      // Generate Daily.co URL from room name using configured domain
      roomUrl = roomManager.getRoomUrlFromName(roomAssignment.roomName);
      console.log('🔧 GenerativeDialogue: Generated roomUrl from roomName:', roomUrl);
    }

    // Host guard: never join a breakout; stay in community
    try {
      const params = new URLSearchParams(window.location.search);
      const urlNameLc = (params.get('name') || '').trim().toLowerCase();
      const me = sessionData?.participants?.find(p => p.name && p.name.toLowerCase() === urlNameLc);
      const isHostMe = !!(me?.isHost) || (sessionData?.hostName && urlNameLc && sessionData.hostName.toLowerCase() === urlNameLc);
      const targetIsMain = !!(roomAssignment?.roomId === 'main' || (roomAssignment?.roomName && (roomAssignment.roomName.includes('community') || roomAssignment.roomName.includes('main'))));
      if (isHostMe && !targetIsMain) {
        console.log('🛑 Host guard: refusing to join breakout; staying in community');
        setIsJoining(false);
        setJoinAttempted(false);
        return;
      }
    } catch (_) {}
    
    if (!roomUrl) {
      console.log('🏠 GenerativeDialogue: No room assignment available yet');
      console.log('🔍 GenerativeDialogue: roomAssignment keys:', Object.keys(roomAssignment || {}));
      console.log('🔍 GenerativeDialogue: roomUrl value:', roomAssignment?.roomUrl);
      console.log('🔍 GenerativeDialogue: roomName value:', roomAssignment?.roomName);
      setIsJoining(false);
      return;
    }

    try {
      // Skip re-joining the same room to avoid stutter
      if (isConnected && currentRoom?.roomUrl && currentRoom.roomUrl === roomUrl) {
        console.log('⏭️ Already in target room; skipping re-join');
        setHasJoinedRoom(true);
        setIsJoining(false);
        return;
      }
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
      const storedName = (sessionStorage.getItem('gd_current_participant_name') || localStorage.getItem('gd_participant_name') || '').trim();
      const currentParticipant = sessionData.participants?.find(p => p.name === storedName) || sessionData.currentParticipant || null;
      const participantName = (currentParticipant?.name || storedName || 'Participant');
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
  // Ensure main room exists and everyone is assigned to it
  const ensureMainRoom = useCallback(async (sessionIdInput) => {
    try {
      const sid = sessionIdInput || sessionData?.sessionId;
      if (!sid) return null;
      const storageKey = `session_${sid}`;
      const base = JSON.parse(localStorage.getItem(storageKey) || 'null') || sessionData || {};
      const assignments = base.roomAssignments || { rooms: {}, participants: {} };
      if (assignments.rooms && assignments.rooms.main && assignments.rooms.main.url) return assignments.rooms.main; // already exists

      // Create or reuse deterministic main
      let main;
      try {
        main = await roomManager.createDailyRoom(`${sid}-community-main`, 'community');
      } catch (_) {
        const url = roomManager.getMainRoomUrl(sid);
        main = { id: `${sid}-community-main`, name: `${sid}-community-main`, url, type: 'community' };
      }
      assignments.rooms = assignments.rooms || {};
      assignments.rooms.main = { id: main.id, name: main.name, url: main.url, type: 'community', participants: [] };
      const participantsList = Array.isArray(base.participants) ? base.participants : [];
      participantsList.forEach(p => {
        assignments.participants[p.id] = {
          participantId: p.id,
          roomId: 'main',
          roomUrl: main.url,
          roomName: main.name,
          roomType: 'community',
          assignedAt: new Date().toISOString()
        };
      });
      assignments.rooms.main.participants = participantsList.map(p => p.id);
      const updated = { ...base, roomAssignments: assignments, breakoutsActive: false, status: 'rooms-assigned' };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      try { window.dispatchEvent(new CustomEvent('session-updated', { detail: { sessionCode: sid, sessionData: updated } })); } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('gd-session-updated-local', { detail: { sessionId: sid, sessionData: updated } })); } catch (_) {}
      setSessionData(updated);
      return assignments.rooms.main;
    } catch (e) {
      console.warn('ensureMainRoom failed:', e);
      return null;
    }
  }, [sessionData]);
  
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

  // Host controls: assign and end breakouts
  const hostCreateBreakouts = useCallback(async (roomType) => {
    if (!sessionData?.sessionId || !sessionData?.participants) return;
    try {
      const sessionId = sessionData.sessionId;
      const storageKey = `session_${sessionId}`;
      const base = JSON.parse(localStorage.getItem(storageKey) || 'null') || sessionData;
      const assignments = base.roomAssignments || { rooms: {}, participants: {} };

      // Bootstrap main room if missing
      if (!assignments.rooms || !assignments.rooms.main) await ensureMainRoom(sessionId);

      // SPECIAL: Fishbowl → 6 people in center; everyone else remains in main
      const typeLcInit = String(roomType || '').toLowerCase();
      if (typeLcInit === 'fishbowl') {
        // Determine center-6 from selectedParticipants; fallback to first 6 non-hosts
        const cleanName = (n) => (String(n || '').split('_')[0] || '').trim();
        const selectedSessionIds = Array.isArray(selectedParticipants) ? selectedParticipants : [];
        const selectedNames = (realParticipants || [])
          .filter(p => selectedSessionIds.includes(p.session_id))
          .map(p => cleanName(p.displayName || p.user_name || p.userName || p.name));
        const host = (base.participants || []).find(p => p.isHost) || null;
        const nonHosts = (base.participants || []).filter(p => !p.isHost);
        let center = selectedNames
          .map(n => nonHosts.find(p => p.name === n))
          .filter(Boolean)
          .map(p => p.id);
        if (center.length < 6) {
          for (const p of nonHosts) {
            if (center.length >= 6) break;
            if (!center.includes(p.id)) center.push(p.id);
          }
        }
        center = center.slice(0, 6);

        // Ensure fishbowl room exists
        let fishbowlRoom;
        try {
          const ts = Date.now().toString().slice(-6);
          fishbowlRoom = await roomManager.createDailyRoom(`${sessionId}-fishbowl-1-${ts}`, 'fishbowl');
        } catch (_) {
          const fallbackId = `${sessionId}-fishbowl-1`;
          fishbowlRoom = { id: fallbackId, name: fallbackId, url: roomManager.getRoomUrlFromName(fallbackId), type: 'fishbowl' };
        }
        assignments.rooms[fishbowlRoom.id] = { ...fishbowlRoom, participants: center, sessionId, assignedAt: new Date().toISOString() };

        // Assign main for others incl. host
        const main = assignments.rooms.main;
        const everyone = (base.participants || []);
        main.participants = everyone.filter(p => !center.includes(p.id)).map(p => p.id);

        // Write participant assignments
        for (const p of everyone) {
          if (center.includes(p.id)) {
            assignments.participants[p.id] = {
              participantId: p.id,
              roomId: fishbowlRoom.id,
              roomUrl: fishbowlRoom.url,
              roomName: fishbowlRoom.name,
              assignedAt: new Date().toISOString()
            };
          } else {
            assignments.participants[p.id] = {
              participantId: p.id,
              roomId: 'main',
              roomUrl: main.url,
              roomName: main.name,
              assignedAt: new Date().toISOString()
            };
          }
        }

        const updatedSession = { ...base, roomAssignments: assignments, breakoutsActive: true, status: 'fishbowl-active' };
        localStorage.setItem(storageKey, JSON.stringify(updatedSession));
        window.dispatchEvent(new CustomEvent('session-updated', { detail: { sessionCode: sessionId, sessionData: updatedSession } }));
        try { window.dispatchEvent(new CustomEvent('gd-session-updated-local', { detail: { sessionId, sessionData: updatedSession } })); } catch (_) {}
        setSessionData(updatedSession);
        console.log('✅ Fishbowl assigned:', { centerCount: center.length });
        return;
      }
      const rt = String(roomType || '').toLowerCase();

      // PERMANENT FIX: Always create breakout rooms via Daily API on the configured domain.
      // Remove any previously cached rooms of this type (e.g., from ROOM_POOL with wrong domain)
      try {
        const toRemove = Object.entries(assignments.rooms || {})
          .filter(([, r]) => String(r?.type || '').toLowerCase() === rt && r && r.id !== 'main')
          .map(([id]) => id);
        toRemove.forEach(id => { delete assignments.rooms[id]; });
      } catch (_) {}

      // HARD RESET: clear all non-main rooms and all non-host participant assignments
      try {
        Object.keys(assignments.rooms || {}).forEach(id => { if (id !== 'main') delete assignments.rooms[id]; });
      } catch (_) {}
      const preservedHostId = Object.values(base.participants || {}).find(p => p.isHost)?.id || null;
      assignments.participants = {};

      // We'll build a fresh room list using Daily API
      let roomList = [];
      const mainRoom = assignments.rooms['main'];
      const params = new URLSearchParams(window.location.search);
      const urlName = (params.get('name') || '').trim().toLowerCase();
      const participantsList = (base.participants || []);
      const hostCandidate = participantsList.find(p => p.isHost)
        || participantsList.find(p => p.name && p.name.toLowerCase() === urlName)
        || (base.hostName ? participantsList.find(p => p.name && p.name.toLowerCase() === String(base.hostName).toLowerCase()) : null);
      const nonHosts = participantsList.filter(p => {
        if (p.isHost) return false;
        if (hostCandidate && p.id === hostCandidate.id) return false;
        return true;
      });
      const typeLc = rt;
      const roomSize = typeLc === 'dyad' ? 2 : typeLc === 'triad' ? 3 : typeLc === 'quad' ? 4 : typeLc === 'kiva' ? 6 : typeLc === 'fishbowl' ? 6 : typeLc === 'self' ? 1 : 2;

      // Ensure enough rooms exist (on-demand create via Daily API when available)
      try {
        const roomsNeeded = Math.ceil(nonHosts.length / roomSize);
        if (typeof roomManager.createDailyRoom === 'function') {
          const ts = Date.now().toString().slice(-6);
          for (let i = 0; i < roomsNeeded; i++) {
            const name = `${sessionId}-${typeLc}-${i + 1}-${ts}`;
            const created = await roomManager.createDailyRoom(name, typeLc);
            assignments.rooms[created.id] = { ...created, participants: [], sessionId, assignedAt: new Date().toISOString() };
          }
          roomList = Object.values(assignments.rooms || {}).filter(r => {
            const t = String(r.type || '').toLowerCase();
            const n = String(r.name || '').toLowerCase();
            const i = String(r.id || '').toLowerCase();
            return t === typeLc || n.includes(typeLc) || i.includes(typeLc);
          });
        } else if (ROOM_POOL && ROOM_POOL[typeLc]) {
          // Fallback to ROOM_POOL but values are now normalized to DAILY_DOMAIN
          ROOM_POOL[typeLc].forEach(r => {
            assignments.rooms[r.id] = { ...r, participants: [], sessionId, assignedAt: new Date().toISOString(), type: typeLc };
          });
          roomList = Object.values(assignments.rooms || {}).filter(r => {
            const t = String(r.type || '').toLowerCase();
            const n = String(r.name || '').toLowerCase();
            const i = String(r.id || '').toLowerCase();
            return t === typeLc || n.includes(typeLc) || i.includes(typeLc);
          });
        }
      } catch (apiErr) {
        console.warn('Room auto-create failed:', apiErr);
      }
      roomList.forEach(r => { r.participants = []; });
      const shuffled = [...nonHosts].sort(() => Math.random() - 0.5);
      // Strictly cap number of rooms to Math.ceil(nonHosts/roomSize)
      const groups = [];
      for (let i = 0; i < shuffled.length; i += roomSize) {
        groups.push(shuffled.slice(i, i + roomSize));
      }
      const roomsToUse = roomList.slice(0, groups.length);
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const room = roomsToUse[i];
        if (!room) break;
        const uniqueIds = Array.from(new Set(group.map(p => p.id)));
        room.participants = uniqueIds;
        uniqueIds.forEach(id => {
          const p = group.find(x => x.id === id);
          assignments.participants[p.id] = {
            participantId: p.id,
            roomId: room.id,
            roomUrl: room.url,
            roomName: room.name,
            assignedAt: new Date().toISOString()
          };
        });
      }
      const host = hostCandidate;
      if (host && mainRoom) {
        const keepHostInCommunity = true; // Host always remains in Community
        assignments.participants[host.id] = {
          participantId: host.id,
          roomId: keepHostInCommunity ? 'main' : roomsToUse[0]?.id || 'main',
          roomUrl: keepHostInCommunity ? mainRoom.url : roomsToUse[0]?.url || mainRoom.url,
          roomName: keepHostInCommunity ? mainRoom.name : roomsToUse[0]?.name || mainRoom.name,
          assignedAt: new Date().toISOString()
        };
        if (keepHostInCommunity) {
          mainRoom.participants = [host.id];
        }
      }
      const updatedSession = { ...base, roomAssignments: assignments, breakoutsActive: true, status: 'breakouts-active' };
      localStorage.setItem(storageKey, JSON.stringify(updatedSession));
      window.dispatchEvent(new CustomEvent('session-updated', { detail: { sessionCode: sessionId, sessionData: updatedSession } }));
      // Notify App (host) to broadcast over session-bus to all participants
      try {
        window.dispatchEvent(new CustomEvent('gd-session-updated-local', { detail: { sessionId, sessionData: updatedSession } }));
      } catch (_) {}
      setSessionData(updatedSession);
      console.log('✅ Breakouts assigned:', { roomType, rooms: roomList.length });
    } catch (e) {
      console.error('❌ Failed to create breakouts:', e);
    }
  }, [sessionData]);

  const hostEndBreakouts = useCallback(() => {
    if (!sessionData?.sessionId || !sessionData?.roomAssignments) return;
    try {
      const sessionId = sessionData.sessionId;
      const storageKey = `session_${sessionId}`;
      const base = JSON.parse(localStorage.getItem(storageKey) || 'null') || sessionData;
      const assignments = base.roomAssignments || { rooms: {}, participants: {} };
      let mainRoom = assignments.rooms['main'];
      if (!mainRoom) {
        // Ensure main exists before pulling everyone back
        ensureMainRoom(sessionId).then(() => {}).catch(() => {});
        mainRoom = assignments.rooms['main'];
      }
      if (!mainRoom) return;
      const host = (base.participants || []).find(p => p.isHost);
      const nonHosts = (base.participants || []).filter(p => !p.isHost);
      Object.values(assignments.rooms).forEach(r => { r.participants = []; });
      mainRoom.participants = [ ...(host ? [host.id] : []), ...nonHosts.map(p => p.id) ];
      [...nonHosts, ...(host ? [host] : [])].forEach(p => {
        assignments.participants[p.id] = {
          participantId: p.id,
          roomId: 'main',
          roomUrl: mainRoom.url,
          roomName: mainRoom.name,
          assignedAt: new Date().toISOString()
        };
      });
      const updatedSession = { ...base, roomAssignments: assignments, breakoutsActive: false, status: 'rooms-assigned' };
      localStorage.setItem(storageKey, JSON.stringify(updatedSession));
      window.dispatchEvent(new CustomEvent('session-updated', { detail: { sessionCode: sessionId, sessionData: updatedSession } }));
      setSessionData(updatedSession);
      console.log('✅ Ended breakouts: everyone back to main');
    } catch (e) {
      console.error('❌ Failed to end breakouts:', e);
    }
  }, [sessionData]);

  // Hook host nav events → breakout actions
  useEffect(() => {
    const onCreate = (e) => {
      const rt = (e && e.detail && e.detail.roomType) || '';
      if (!rt) return;
      // Debounce to prevent double assignment bursts
      const now = Date.now();
      const last = Number(localStorage.getItem('gd_last_breakouts_ts') || 0);
      if (now - last < 1500) { console.log('[HostNav] Ignored duplicate breakout trigger'); return; }
      localStorage.setItem('gd_last_breakouts_ts', String(now));
      console.log('[HostNav] Received host-create-breakouts event:', rt);
      hostCreateBreakouts(rt);
    };
    const onEnd = () => { console.log('[HostNav] Received host-end-breakouts'); hostEndBreakouts(); };
    window.addEventListener('host-create-breakouts', onCreate);
    window.addEventListener('host-end-breakouts', onEnd);
    return () => {
      window.removeEventListener('host-create-breakouts', onCreate);
      window.removeEventListener('host-end-breakouts', onEnd);
    };
  }, [hostCreateBreakouts, hostEndBreakouts]);
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
          {isConnected ? `🎥 Live Video (${realParticipants.filter(p=>!p.local).length} participants in room)` : hasJoinedRoom ? '🔄 Connecting to video...' : '⏳ Waiting for room assignment...'}
          <br />
          Session: {sessionData.sessionId}
          <br />
          Total Participants: {sessionData.participants?.length || 0}
        </div>
      )}

      {/* Host Controls removed; handled via left navigation */}

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
