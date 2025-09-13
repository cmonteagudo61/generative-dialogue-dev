import React, { useState, useEffect } from 'react';
import './ParticipantJoin.css';

const ParticipantJoin = ({ sessionCode, onJoinSession, onBackToMain }) => {
  const [participantName, setParticipantName] = useState('');
  const [sessionInfo, setSessionInfo] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // BUGFIX: Get session code directly from URL to avoid stale state
  const urlSessionCode = new URLSearchParams(window.location.search).get('session') || sessionCode;
  console.log('🔍 ParticipantJoin: URL session code:', urlSessionCode, 'Prop session code:', sessionCode);

  // Load session information on mount
  useEffect(() => {
    const loadSessionInfo = () => {
      try {
        // Try to load existing session data first
        const currentSessionData = localStorage.getItem(`session_${urlSessionCode}`);
        let currentSession;
        
        if (currentSessionData) {
          currentSession = JSON.parse(currentSessionData);
          console.log('📋 ParticipantJoin: Found existing session for', urlSessionCode, 'with', currentSession.participants.length, 'participants');
        } else {
          console.log('📋 ParticipantJoin: No session data found for', urlSessionCode, '- creating stub session');
          // Create a minimal session structure for cross-browser compatibility
          currentSession = {
            sessionId: urlSessionCode,
            hostName: 'Host', // Will be updated when participant joins
            participants: [], // Empty initially
            createdAt: new Date().toISOString(),
            status: 'waiting',
            maxParticipants: 6,
            duration: 90,
            roomConfiguration: null,
            roomAssignments: null
          };
        }
        setSessionInfo(currentSession);
      } catch (err) {
        console.error('Error loading session information:', err);
        setError('Error loading session information.');
      }
    };

    if (urlSessionCode) {
      loadSessionInfo();
      // Poll for session updates (in real app, this would be WebSocket)
      const interval = setInterval(loadSessionInfo, 3000);
      return () => clearInterval(interval);
    }
  }, [urlSessionCode]);

  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!sessionInfo) {
      setError('Session information not available');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Load the most current session data from localStorage for the URL sessionCode
      const currentSessionData = localStorage.getItem(`session_${urlSessionCode}`);
      let currentSession;
      
      if (currentSessionData) {
        currentSession = JSON.parse(currentSessionData);
        console.log('📋 Participant: Found existing session for', urlSessionCode, 'with', currentSession.participants.length, 'participants');
      } else {
        console.log('📋 Participant: No session data found for', urlSessionCode, '- creating new session for cross-browser compatibility');
        // Create a minimal session structure for cross-browser compatibility
        currentSession = {
          sessionId: urlSessionCode,
          hostName: 'Host',
          participants: [],
          createdAt: new Date().toISOString(),
          status: 'waiting',
          maxParticipants: 6,
          duration: 90,
          roomConfiguration: null,
          roomAssignments: null
        };
      }

      // Debug session data
      console.log('🔍 Session data check:', {
        sessionCode: urlSessionCode,
        participantCount: currentSession.participants.length,
        maxParticipants: currentSession.maxParticipants,
        participants: currentSession.participants.map(p => p.name)
      });

      // Check if session is full
      if (currentSession.participants.length >= currentSession.maxParticipants) {
        console.error('❌ Session appears full:', {
          current: currentSession.participants.length,
          max: currentSession.maxParticipants,
          participants: currentSession.participants
        });
        setError(`Session is full (${currentSession.participants.length}/${currentSession.maxParticipants}). Please contact your host.`);
        return;
      }

      // REMOVED: Allow duplicate names for testing
      // Note: Daily.co handles unique identities with suffixes like "Ruth1_394451_bzfk"
      // if (currentSession.participants.some(p => 
      //   p.name.toLowerCase() === participantName.trim().toLowerCase()
      // )) {
      //   setError('Name already taken. Please choose a different name.');
      //   return;
      // }

      // Add participant to session
      const newParticipant = {
        id: `participant_${Date.now()}`,
        name: participantName.trim(),
        isHost: false,
        joinedAt: new Date().toISOString(),
        status: 'ready'
      };

      const updatedSession = {
        ...currentSession,
        sessionId: urlSessionCode, // Ensure sessionId matches the URL session code
        participants: [...currentSession.participants, newParticipant]
      };

      // Store participant name in localStorage for GenerativeDialogue to find
      localStorage.setItem('gd_participant_name', participantName.trim());
      console.log('💾 ParticipantJoin: Stored participant name in localStorage:', participantName.trim());

      // Update localStorage
      const storageKey = `session_${urlSessionCode}`;
      localStorage.setItem(storageKey, JSON.stringify(updatedSession));
      console.log('💾 Participant: Saved session data to key:', storageKey, 'with', updatedSession.participants.length, 'participants');
      
      // Trigger storage event for cross-tab communication
      window.dispatchEvent(new StorageEvent('storage', {
        key: `session_${urlSessionCode}`,
        newValue: JSON.stringify(updatedSession),
        storageArea: localStorage
      }));

      // Also trigger a custom event for same-tab communication
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: {
          sessionCode: urlSessionCode,
          sessionData: updatedSession
        }
      }));

      // WORKAROUND: Also try to update the host's session if it exists
      // This is a temporary solution for testing - in production we'd use a backend
      try {
        // Check if there's a host session we should update
        const allKeys = Object.keys(localStorage);
        const sessionKeys = allKeys.filter(key => key.startsWith('session_') && key.includes(urlSessionCode));
        
        for (const key of sessionKeys) {
          const existingData = localStorage.getItem(key);
          if (existingData) {
            const existingSession = JSON.parse(existingData);
            // If this session has a host and we're not already in it
            if (existingSession.participants.some(p => p.isHost) && 
                !existingSession.participants.some(p => p.name === participantName.trim())) {
              // Add ourselves to the host's session
              existingSession.participants.push(newParticipant);
              localStorage.setItem(key, JSON.stringify(existingSession));
              console.log('🔄 Participant: Updated host session', key, 'with new participant');
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not update host session:', error);
      }

      console.log('🎯 Participant joined successfully:', {
        sessionCode: urlSessionCode, // Use URL sessionCode
        participantName: participantName.trim(),
        totalParticipants: updatedSession.participants.length
      });

      // Join the session - ensure we use the URL sessionCode
      onJoinSession({
        ...updatedSession,
        sessionId: urlSessionCode, // Force correct sessionId
        currentParticipant: newParticipant,
        sessionCode: urlSessionCode // Use URL sessionCode
      });

    } catch (err) {
      setError('Failed to join session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleJoinSession();
    }
  };

  if (!sessionInfo && !error) {
    return (
      <div className="participant-join loading">
        <div className="loading-spinner">Loading session...</div>
      </div>
    );
  }

  return (
    <div className="participant-join">
      <div className="join-container">
        <div className="session-header">
          <h1>🎯 Join Dialogue Session</h1>
          <div className="session-code-display">
            Session: <strong>{urlSessionCode}</strong>
          </div>
        </div>

        {error ? (
          <div className="error-section">
            <div className="error-message">{error}</div>
            <button className="back-btn" onClick={onBackToMain}>
              ← Back to Main
            </button>
          </div>
        ) : (
          <>
            <div className="session-info">
              <h2>Session Details</h2>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Duration:</span>
                  <span className="info-value">{sessionInfo?.duration || 90} minutes</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Participants:</span>
                  <span className="info-value">
                    {sessionInfo?.participants?.length || 0}/{sessionInfo?.maxParticipants || 6}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Status:</span>
                  <span className={`info-value status-${sessionInfo?.status}`}>
                    {sessionInfo?.status === 'waiting' ? 'Waiting to start' : 
                     sessionInfo?.status === 'active' ? 'In progress' : 
                     sessionInfo?.status || 'Unknown'}
                  </span>
                </div>
              </div>

              {sessionInfo?.participants && sessionInfo.participants.length > 0 && (
                <div className="current-participants">
                  <h3>Current Participants</h3>
                  <div className="participants-list">
                    {sessionInfo.participants.map((participant) => (
                      <div key={participant.id} className="participant-item">
                        <span className="participant-name">{participant.name}</span>
                        {participant.isHost && <span className="host-badge">Host</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="join-form">
              <div className="form-group">
                <label htmlFor="participantName">Your Name</label>
                <input
                  id="participantName"
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter your name"
                  maxLength={30}
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div className="join-actions">
                <button 
                  className="join-btn"
                  onClick={handleJoinSession}
                  disabled={isLoading || !participantName.trim()}
                >
                  {isLoading ? 'Joining...' : '🚀 Join Session'}
                </button>
                
                <button 
                  className="back-btn"
                  onClick={onBackToMain}
                  disabled={isLoading}
                >
                  ← Back to Main
                </button>
              </div>
            </div>

            <div className="session-structure">
              <h3>Session Structure</h3>
              <div className="structure-timeline">
                <div className="timeline-item">
                  <span className="timeline-phase">Connect</span>
                  <span className="timeline-duration">25 min</span>
                  <span className="timeline-description">Initial connections in pairs</span>
                </div>
                <div className="timeline-item">
                  <span className="timeline-phase">Explore</span>
                  <span className="timeline-duration">30 min</span>
                  <span className="timeline-description">Deeper sharing and exploration</span>
                </div>
                <div className="timeline-item">
                  <span className="timeline-phase">Discover</span>
                  <span className="timeline-duration">30 min</span>
                  <span className="timeline-description">Synthesis and insights</span>
                </div>
                <div className="timeline-item">
                  <span className="timeline-phase">Closing</span>
                  <span className="timeline-duration">5 min</span>
                  <span className="timeline-description">Reflection and harvest</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ParticipantJoin;
