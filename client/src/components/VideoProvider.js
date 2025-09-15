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

  const handleParticipantUpdated = useCallback(() => {
    if (!throttleTimeoutRef.current) {
      throttleTimeoutRef.current = setTimeout(() => {
        if (callObjectRef.current) {
            setParticipants(callObjectRef.current.participants());
        }
        throttleTimeoutRef.current = null;
      }, 250);
    }
  }, []);

  // --- Main useEffect for Daily.co setup ---
  useEffect(() => {
    if (!dailyLoaded || !window.DailyIframe) return;
    if (callObjectRef.current) return;

    // Event handlers attachment function
    const attachEventHandlers = (call) => {
      call.on('joined-meeting', handleJoinedMeeting);
      call.on('left-meeting', handleLeftMeeting);
      call.on('participant-joined', handleParticipantJoined);
      call.on('participant-updated', handleParticipantUpdated);
      call.on('participant-left', handleParticipantLeft);
      call.on('track-started', handleParticipantUpdated);
      call.on('error', handleError);
    };

    // More aggressive initialization with multiple retry attempts
    const initializeCallObject = (attempt = 1) => {
      try {
        if (callObjectRef.current) return; // Already initialized
        
        console.log(`🔄 Daily.co initialization attempt ${attempt}`);
        
        // Create call object without invalid properties for call object mode
        const call = window.DailyIframe.createCallObject();
        callObjectRef.current = call;
        setCallObject(call);
        window.dailyCallObject = call;
        
        // Attach event handlers
        attachEventHandlers(call);
        
        console.log('✅ Daily.co call object initialized successfully');
      } catch (error) {
        console.error(`❌ Daily.co initialization attempt ${attempt} failed:`, error);
        
        // Retry up to 5 times with increasing delays
        if (attempt < 5) {
          setTimeout(() => initializeCallObject(attempt + 1), attempt * 200);
        } else {
          console.error('❌ Daily.co initialization failed after 5 attempts');
        }
      }
    };

    // Start initialization with a small delay
    setTimeout(() => initializeCallObject(), 100);

    const handleError = (e) => {
      console.error('📞 Daily.co error:', e);
      setError(e.errorMsg || 'Unknown error');
    };

    const handleJoinedMeeting = () => {
      console.log('📞 Daily.co: Joined meeting successfully');
      setIsConnected(true);
      const currentParticipants = callObjectRef.current?.participants() || {};
      
      // Enhanced debugging for video feed issues
      console.log('🔍 VideoProvider: DETAILED ROOM ANALYSIS:');
      console.log('🔍 VideoProvider: Room URL:', callObjectRef.current?.meetingState()?.roomUrl);
      console.log('🔍 VideoProvider: Meeting ID:', callObjectRef.current?.meetingState()?.meetingId);
      console.log('🔍 VideoProvider: Domain:', callObjectRef.current?.meetingState()?.domainName);
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
      
      setParticipants(participantsWithCleanNames);
    };
    
    const handleLeftMeeting = () => {
      console.log('📞 Daily.co: Left meeting');
      setIsConnected(false);
      setParticipants({});
    };

    // Event handlers will be attached during initialization

    return () => {
      clearTimeout(throttleTimeoutRef.current);
      if (callObjectRef.current) {
        callObjectRef.current.off('joined-meeting', handleJoinedMeeting);
        callObjectRef.current.off('left-meeting', handleLeftMeeting);
        callObjectRef.current.off('participant-joined', handleParticipantJoined);
        callObjectRef.current.off('participant-updated', handleParticipantUpdated);
        callObjectRef.current.off('participant-left', handleParticipantLeft);
        callObjectRef.current.off('track-started', handleParticipantUpdated);
        callObjectRef.current.off('error', handleError);

        if (callObjectRef.current !== window.dailyCallObject) {
          callObjectRef.current.destroy();
        }
      }
      callObjectRef.current = null;
    };
  }, [dailyLoaded, handleParticipantJoined, handleParticipantLeft, handleParticipantUpdated]);

  // --- Join Room Function ---
  const joinRoom = useCallback(async (roomUrl, userName = null) => {
    // Ultra-robust readiness check with multiple strategies
    if (!callObjectRef.current) {
      console.log('🔄 Call object not ready, attempting comprehensive initialization...');
      
      // Strategy 1: Wait for existing initialization
      for (let i = 0; i < 50; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (callObjectRef.current) {
          console.log('✅ Call object ready after waiting');
          break;
        }
      }
      
      // Strategy 2: Force re-initialization if still not ready
      if (!callObjectRef.current && window.DailyIframe) {
        console.log('🔧 Force re-initializing Daily.co call object...');
        try {
          const call = window.DailyIframe.createCallObject();
          callObjectRef.current = call;
          setCallObject(call);
          window.dailyCallObject = call;
          
          // Attach event handlers to the force-initialized call object
          call.on('joined-meeting', () => {
            console.log('📞 Daily.co: Joined meeting successfully');
            setIsConnected(true);
            const currentParticipants = callObjectRef.current?.participants() || {};
            setParticipants(currentParticipants);
          });
          call.on('left-meeting', () => {
            console.log('📞 Daily.co: Left meeting');
            setIsConnected(false);
            setParticipants({});
          });
          call.on('participant-joined', handleParticipantJoined);
          call.on('participant-updated', handleParticipantUpdated);
          call.on('participant-left', handleParticipantLeft);
          call.on('track-started', handleParticipantUpdated);
          call.on('error', (e) => {
            console.error('📞 Daily.co error:', e);
            setError(e.errorMsg || 'Unknown error');
          });
          
          console.log('✅ Force re-initialization successful');
        } catch (error) {
          console.error('❌ Force re-initialization failed:', error);
        }
      }
      
      // Strategy 3: Final check
      if (!callObjectRef.current) {
        throw new Error('Call object not initialized after comprehensive attempts');
      }
    }
    
    // CRITICAL: Log exactly what room we're trying to join
    console.log('🚨 ATTEMPTING TO JOIN ROOM:', {
      participantName: userName,
      roomUrl,
      timestamp: new Date().toISOString()
    });
    
    const meetingState = callObjectRef.current.meetingState();
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
      
      // SIMPLE BUT EFFECTIVE IDENTITY OVERRIDE: Unique name with session info
      const timestamp = Date.now().toString().slice(-6); // Last 6 digits
      const sessionId = Math.random().toString(36).substring(2, 6); // 4 char random
      const uniqueDisplayName = `${displayName}_${timestamp}_${sessionId}`;
      
      console.log('🎥 Joining Daily.co with unique identity:', displayName, '→', uniqueDisplayName);
      
      // CRITICAL: Join directly with userName to suppress name prompt
      // preAuth doesn't suppress the name prompt - we need to provide userName in join()
      console.log('🚨 CALLING join() directly with userName to suppress name prompt');
      await callObjectRef.current.join({ 
        url: roomUrl, 
        userName: uniqueDisplayName,  // This suppresses the name prompt!
        // Additional user data for identification
        userData: { 
          displayName: displayName,
          originalName: displayName, 
          joinTime: Date.now(),
          sessionId: sessionId 
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
    const count = 12; // Fixed count for fishbowl demo
    const realParticipants = participantArray;
    const local = realParticipants.find(p => p.local);
    const remotes = realParticipants.filter(p => !p.local);
    
    let providedParticipants = local ? [local, ...remotes] : remotes;

    if (providedParticipants.length < count) {
      providedParticipants = [
        ...providedParticipants,
        ...getMockParticipants(count - providedParticipants.length, providedParticipants.length + 1)
      ];
    } else if (providedParticipants.length > count) {
      providedParticipants = providedParticipants.slice(0, count);
    }
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
