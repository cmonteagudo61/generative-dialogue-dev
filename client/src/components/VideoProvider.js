import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

const DAILY_JS_URL = 'https://unpkg.com/@daily-co/daily-js@0.80.0';
const ROOM_URL = 'https://generativedialogue.daily.co/ReactRoom';

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
  const [participants, setParticipants] = useState([]);
  const [localParticipant, setLocalParticipant] = useState(null);
  const [callObject, setCallObject] = useState(null);
  const [error, setError] = useState(null);
  const [dailyLoaded, setDailyLoaded] = useState(!!window.DailyIframe);
  const callObjectRef = useRef(null);

  // Load Daily.co script
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

  // Create call object and join room
  useEffect(() => {
    if (!dailyLoaded || !window.DailyIframe) return;
    if (callObjectRef.current) return;
    let call;
    if (window.dailyCallObject) {
      call = window.dailyCallObject;
    } else {
      call = window.DailyIframe.createCallObject();
      window.dailyCallObject = call;
    }
    callObjectRef.current = call;
    setCallObject(call);
    call.join({ url: ROOM_URL, userName: 'User ' + Math.floor(Math.random() * 1000) });
    const handleParticipants = () => {
      const all = call.participants();
      setParticipants(Object.values(all));
      setLocalParticipant(Object.values(all).find(p => p.local));
    };
    const handleError = (e) => setError(e.errorMsg || 'Unknown error');
    call.on('joined-meeting', handleParticipants);
    call.on('participant-joined', handleParticipants);
    call.on('participant-updated', handleParticipants);
    call.on('participant-left', handleParticipants);
    call.on('track-started', handleParticipants);
    call.on('error', handleError);
    return () => {
      call.off('joined-meeting', handleParticipants);
      call.off('participant-joined', handleParticipants);
      call.off('participant-updated', handleParticipants);
      call.off('participant-left', handleParticipants);
      call.off('track-started', handleParticipants);
      call.off('error', handleError);
      if (call !== window.dailyCallObject) {
        call.destroy();
      }
      callObjectRef.current = null;
    };
  }, [dailyLoaded]);

  // For fishbowl demo, we want 10+ participants to show the full effect
  const count = 12; // Fixed count for fishbowl demo

  // Compose participants: local, then remotes, then mocks to fill grid
  let providedParticipants = [];
  let realParticipants = participants || [];
  let local = realParticipants.find(p => p.local);
  let remotes = realParticipants.filter(p => !p.local);
  if (local) {
    providedParticipants = [local, ...remotes];
  } else {
    providedParticipants = [];
  }
  // Fill with mocks if needed
  if (providedParticipants.length < count) {
    providedParticipants = [
      ...providedParticipants,
      ...getMockParticipants(count - providedParticipants.length, providedParticipants.length + 1)
    ];
  } else if (providedParticipants.length > count) {
    providedParticipants = providedParticipants.slice(0, count);
  }

  return (
    <VideoContext.Provider value={{ 
      participants: providedParticipants, 
      realParticipants: realParticipants, // NEW: Provide real participants count
      localParticipant: local, 
      callObject, 
      error 
    }}>
      {children}
    </VideoContext.Provider>
  );
}; 