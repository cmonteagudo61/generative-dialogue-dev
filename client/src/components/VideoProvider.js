import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';

const DAILY_JS_URL = 'https://unpkg.com/@daily-co/daily-js@0.80.0';

const VideoContext = createContext();

export const useVideo = () => useContext(VideoContext);

// Helper to generate mock participants (with placeholder image)
const getMockParticipants = (count, startIndex = 1) => {
  return Array.from({ length: count }).map((_, i) => ({
    session_id: `mock-${startIndex + i}`,
    user_name: `Mock User ${startIndex + i}`,
    tracks: { video: { state: 'unavailable' } },
    local: false,
    mockImage: `https://placehold.co/400x225/808080/FFFFFF?text=Mock+${startIndex + i}`,
  }));
};

// Helper to extract clean display name from Daily.co unique username
const getCleanDisplayName = (userName) => {
  if (!userName) return 'Participant';
  // Extract original name from format: "OriginalName_timestamp_sessionId"
  const parts = userName.split('_');
  return parts.length >= 3 ? parts[0] : userName;
};

export const VideoProvider = ({ children }) => {
  const [participants, setParticipants] = useState({});
  const [callObject, setCallObject] = useState(null);
  const [error, setError] = useState(null);
  const [dailyLoaded, setDailyLoaded] = useState(!!window.DailyIframe);
  const [isConnected, setIsConnected] = useState(false);
  const callObjectRef = useRef(null);
  const throttleTimeoutRef = useRef(null);
  const videoTracksRef = useRef(new Map()); // sessionId -> MediaStreamTrack

  // --- Memoized Event Handlers ---
  const handleParticipantJoined = useCallback((event) => {
    console.log('📞 Daily.co: participant-joined', event);
    
    // CRITICAL: Track who joins which room
    console.log('🚨 PARTICIPANT JOINED ROOM:', {
      participantName: getCleanDisplayName(event.participant.user_name),
      userName: event.participant.user_name,
      sessionId: event.participant.session_id,
      roomUrl: callObjectRef.current?.meetingState()?.roomUrl,
      meetingId: callObjectRef.current?.meetingState()?.meetingId,
      totalInRoom: Object.keys(callObjectRef.current?.participants() || {}).length
    });
    
    // Add clean display name for UI
    const participantWithCleanName = {
      ...event.participant,
      displayName: getCleanDisplayName(event.participant.user_name)
    };
    setParticipants(p => ({ ...p, [event.participant.session_id]: participantWithCleanName }));
  }, []);

  const handleParticipantLeft = useCallback((event) => {
    console.log('📞 Daily.co: participant-left', event);
    
    // CRITICAL: Track who leaves which room
    console.log('🚨 PARTICIPANT LEFT ROOM:', {
      participantName: getCleanDisplayName(event.participant.user_name),
      userName: event.participant.user_name,
      sessionId: event.participant.session_id,
      roomUrl: callObjectRef.current?.meetingState()?.roomUrl,
      totalInRoom: Object.keys(callObjectRef.current?.participants() || {}).length - 1
    });
    
    setParticipants(p => {
      const { [event.participant.session_id]: _, ...rest } = p;
      return rest;
    });
  }, []);

  const refreshParticipants = useCallback(() => {
    if (!callObjectRef.current) return;
    const raw = callObjectRef.current.participants();
    // Merge any captured video tracks onto participant objects so UI can render streams
    Object.keys(raw).forEach((sid) => {
      const track = videoTracksRef.current.get(sid);
      if (track) {
        raw[sid] = {
          ...raw[sid],
          tracks: {
            ...raw[sid].tracks,
            video: {
              ...(raw[sid].tracks?.video || {}),
              persistentTrack: track,
            },
          },
        };
      }
    });
    setParticipants(raw);
  }, []);

  const handleParticipantUpdated = useCallback(() => {
    if (!throttleTimeoutRef.current) {
      throttleTimeoutRef.current = setTimeout(() => {
        refreshParticipants();
        throttleTimeoutRef.current = null;
      }, 250);
    }
  }, [refreshParticipants]);

  // --- Main useEffect for Daily.co setup ---
  useEffect(() => {
    if (!dailyLoaded || !window.DailyIframe) return;
    if (callObjectRef.current) return;

    // Prefer adopting an existing global call object if one already exists
    // This avoids duplicate instance errors in tabs where a call object was
    // created outside the React lifecycle (e.g., via console helpers).
    const existing = window.dailyCallObject;
    const call = existing || window.DailyIframe.createCallObject();
    callObjectRef.current = call;
    setCallObject(call);
    window.dailyCallObject = call;

    const handleError = (e) => {
      console.error('📞 Daily.co error:', e);
      setError(e.errorMsg || 'Unknown error');
    };

    const handleJoinedMeeting = () => {
      console.log('📞 Daily.co: Joined meeting successfully');
      // Clear any prior error banner once we are in the room
      setError(null);
      setIsConnected(true);
      const currentParticipants = call.participants();
      
      // Enhanced debugging for video feed issues
      console.log('🔍 VideoProvider: DETAILED ROOM ANALYSIS:');
      console.log('🔍 VideoProvider: Room URL:', call.meetingState()?.roomUrl);
      console.log('🔍 VideoProvider: Meeting ID:', call.meetingState()?.meetingId);
      console.log('🔍 VideoProvider: Domain:', call.meetingState()?.domainName);
      console.log('🔍 VideoProvider: Total participants in room:', Object.keys(currentParticipants).length);
      
      Object.keys(currentParticipants).forEach(id => {
        const p = currentParticipants[id];
        console.log(`🔍 VideoProvider: Participant ${id}:`, {
          userName: p.user_name,
          displayName: getCleanDisplayName(p.user_name),
          local: p.local,
          video: p.video,
          audio: p.audio
        });
      });
      
      // Add clean display names to all participants
      const participantsWithCleanNames = {};
      Object.keys(currentParticipants).forEach(id => {
        participantsWithCleanNames[id] = {
          ...currentParticipants[id],
          displayName: getCleanDisplayName(currentParticipants[id].user_name)
        };
      });
      
      // Initialize state with any known tracks merged in
      refreshParticipants();
    };
    
    const handleLeftMeeting = () => {
      console.log('📞 Daily.co: Left meeting');
      // Clear errors on leave
      setError(null);
      setIsConnected(false);
      setParticipants({});
    };

    call.on('joined-meeting', handleJoinedMeeting);
    call.on('left-meeting', handleLeftMeeting);
    call.on('participant-joined', handleParticipantJoined);
    call.on('participant-updated', handleParticipantUpdated);
    call.on('participant-left', handleParticipantLeft);
    const handleTrackStarted = (ev) => {
      try {
        if (ev?.participant?.session_id && ev?.track?.kind === 'video') {
          videoTracksRef.current.set(ev.participant.session_id, ev.track);
        }
      } catch (_) {}
      handleParticipantUpdated();
    };
    const handleTrackStopped = (ev) => {
      try {
        if (ev?.participant?.session_id && ev?.track?.kind === 'video') {
          videoTracksRef.current.delete(ev.participant.session_id);
        }
      } catch (_) {}
      handleParticipantUpdated();
    };

    call.on('track-started', handleTrackStarted);
    call.on('track-stopped', handleTrackStopped);
    call.on('error', handleError);

    return () => {
      clearTimeout(throttleTimeoutRef.current);
      call.off('joined-meeting', handleJoinedMeeting);
      call.off('left-meeting', handleLeftMeeting);
      call.off('participant-joined', handleParticipantJoined);
      call.off('participant-updated', handleParticipantUpdated);
      call.off('participant-left', handleParticipantLeft);
      call.off('track-started', handleTrackStarted);
      call.off('track-stopped', handleTrackStopped);
      call.off('error', handleError);

      if (call !== window.dailyCallObject) {
        call.destroy();
      }
      callObjectRef.current = null;
      videoTracksRef.current.clear();
    };
  }, [dailyLoaded, handleParticipantJoined, handleParticipantLeft, handleParticipantUpdated, refreshParticipants]);

  // --- Join Room Function ---
  const joinRoom = useCallback(async (roomUrl, userName = null) => {
    // Ensure Daily.js is loaded before attempting to create/join
    const ensureDailyLoaded = () => new Promise((resolve, reject) => {
      if (window.DailyIframe) return resolve();
      try {
        const existing = document.querySelector(`script[src="${DAILY_JS_URL}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('Failed to load Daily.js')));
          return;
        }
        const script = document.createElement('script');
        script.src = DAILY_JS_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Daily.js'));
        document.head.appendChild(script);
      } catch (e) {
        reject(e);
      }
    });

    try {
      await ensureDailyLoaded();
    } catch (e) {
      throw new Error('Daily iframe not loaded');
    }

    // Clear any stale errors before a fresh join attempt
    try { setError(null); } catch (_) {}
    // Adopt or (re)create call object if it is missing
    if (!callObjectRef.current) {
      try {
        if (!window.DailyIframe) throw new Error('Daily iframe not loaded');
        const existing = window.dailyCallObject;
        const call = existing || window.DailyIframe.createCallObject();
        callObjectRef.current = call;
        setCallObject(call);
        window.dailyCallObject = call;
      } catch (e) {
        throw new Error('Call object not initialized');
      }
    }
    
    // CRITICAL: Log exactly what room we're trying to join
    console.log('🚨 ATTEMPTING TO JOIN ROOM:', {
      participantName: userName,
      roomUrl,
      timestamp: new Date().toISOString()
    });
    
    const meetingState = callObjectRef.current.meetingState && callObjectRef.current.meetingState();
    if (meetingState === 'joined-meeting') {
      console.log('Already joined meeting, leaving first...');
      try {
        await callObjectRef.current.leave();
        // Wait a moment for clean disconnect
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.log('Error leaving previous meeting:', e);
      }
    }
    try {
      // FIXED: Use provided userName or get from localStorage, fallback to random
      let displayName = userName;
      if (!displayName) {
        // Try to get current participant name from localStorage
        const participantName = localStorage.getItem('gd_participant_name');
        displayName = participantName || `User ${Math.floor(Math.random() * 1000)}`;
      }
      
      // Always present a CLEAN user name to Daily; keep uniqueness only in userData
      const timestamp = Date.now().toString().slice(-6); // for diagnostics only
      const sessionId = Math.random().toString(36).substring(2, 6);
      const uniqueDisplayName = displayName;
      
      console.log('🎥 Joining Daily.co with clean identity:', uniqueDisplayName);
      
      // CRITICAL: Join directly with userName to suppress name prompt
      // preAuth doesn't suppress the name prompt - we need to provide userName in join()
      console.log('🚨 CALLING join() directly with userName to suppress name prompt');
      await callObjectRef.current.join({ 
        url: roomUrl, 
        userName: uniqueDisplayName,  // Clean name visible to everyone
        userData: { 
          displayName: displayName,
          originalName: displayName,
          joinTime: Date.now(),
          uid: `${timestamp}-${sessionId}`
        }
      });
      console.log('🚨 join() COMPLETED successfully');
      
      console.log('✅ Successfully joined Daily.co room as:', uniqueDisplayName);
      return callObjectRef.current;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
    }
  }, []);

  // --- Leave Room Function ---
  const leaveRoom = useCallback(async () => {
    if (!callObjectRef.current) {
      console.log('No call object available to leave');
      return;
    }
    const meetingState = callObjectRef.current.meetingState();
    if (meetingState === 'joined-meeting') {
      console.log('🎥 Leaving Daily.co room...');
      try {
        await callObjectRef.current.leave();
        console.log('✅ Successfully left Daily.co room');
      } catch (error) {
        console.error('❌ Failed to leave room:', error);
        throw error;
      }
    } else {
      console.log('Not in a meeting, no need to leave');
    }
  }, []);

  // --- Script Loader ---
  useEffect(() => {
    if (window.DailyIframe) {
      setDailyLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = DAILY_JS_URL;
    script.async = true;
    script.onload = () => setDailyLoaded(true);
    script.onerror = () => setError('Failed to load Daily.co script');
    document.head.appendChild(script);
  }, []);

  // --- Memoize the final participant arrays and context value ---
  const participantArray = useMemo(() => Object.values(participants), [participants]);

  const composedParticipants = useMemo(() => {
    // Show ONLY real Daily.co participants. Do not pad with mock participants.
    const realParticipants = participantArray;
    const local = realParticipants.find(p => p.local);
    const remotes = realParticipants.filter(p => !p.local);
    const providedParticipants = local ? [local, ...remotes] : remotes;
    return { providedParticipants, realParticipants, local };
  }, [participantArray]);

  const contextValue = useMemo(() => ({
    participants: composedParticipants.providedParticipants, 
    realParticipants: composedParticipants.realParticipants, 
    localParticipant: composedParticipants.local, 
    callObject, 
    error,
    isConnected,
    joinRoom,
    leaveRoom
  }), [composedParticipants, callObject, error, isConnected, joinRoom, leaveRoom]);
  
  return (
    <VideoContext.Provider value={contextValue}>
      {children}
    </VideoContext.Provider>
  );
};
