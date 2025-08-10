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
    setParticipants(p => ({ ...p, [event.participant.session_id]: event.participant }));
  }, []);

  const handleParticipantLeft = useCallback((event) => {
    console.log('📞 Daily.co: participant-left', event);
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

    const call = window.DailyIframe.createCallObject();
    callObjectRef.current = call;
    setCallObject(call);
    window.dailyCallObject = call;

    const handleError = (e) => {
      console.error('📞 Daily.co error:', e);
      setError(e.errorMsg || 'Unknown error');
    };

    const handleJoinedMeeting = () => {
      console.log('📞 Daily.co: Joined meeting successfully');
      setIsConnected(true);
      setParticipants(call.participants());
    };
    
    const handleLeftMeeting = () => {
      console.log('📞 Daily.co: Left meeting');
      setIsConnected(false);
      setParticipants({});
    };

    call.on('joined-meeting', handleJoinedMeeting);
    call.on('left-meeting', handleLeftMeeting);
    call.on('participant-joined', handleParticipantJoined);
    call.on('participant-updated', handleParticipantUpdated);
    call.on('participant-left', handleParticipantLeft);
    call.on('track-started', handleParticipantUpdated);
    call.on('error', handleError);

    return () => {
      clearTimeout(throttleTimeoutRef.current);
      call.off('joined-meeting', handleJoinedMeeting);
      call.off('left-meeting', handleLeftMeeting);
      call.off('participant-joined', handleParticipantJoined);
      call.off('participant-updated', handleParticipantUpdated);
      call.off('participant-left', handleParticipantLeft);
      call.off('track-started', handleParticipantUpdated);
      call.off('error', handleError);

      if (call !== window.dailyCallObject) {
        call.destroy();
      }
      callObjectRef.current = null;
    };
  }, [dailyLoaded, handleParticipantJoined, handleParticipantLeft, handleParticipantUpdated]);

  // --- Join Room Function ---
  const joinRoom = useCallback(async (roomUrl) => {
    if (!callObjectRef.current) throw new Error('Call object not initialized');
    const meetingState = callObjectRef.current.meetingState();
    if (meetingState === 'joined-meeting') {
      console.log('Already joined meeting, skipping join call');
      return callObjectRef.current;
    }
    try {
      await callObjectRef.current.join({ url: roomUrl, userName: 'User ' + Math.floor(Math.random() * 1000) });
      return callObjectRef.current;
    } catch (error) {
      console.error('Failed to join room:', error);
      throw error;
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
    joinRoom
  }), [composedParticipants, callObject, error, isConnected, joinRoom]);
  
  return (
    <VideoContext.Provider value={contextValue}>
      {children}
    </VideoContext.Provider>
  );
};
