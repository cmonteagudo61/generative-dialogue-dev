import React, { useState, useEffect } from 'react';
import './SessionJoin.css';

const SessionJoin = ({ onJoinSession, sessionId = null }) => {
  const [participantName, setParticipantName] = useState('');
  const [sessionCode, setSessionCode] = useState(sessionId || '');
  const [customSessionCode, setCustomSessionCode] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate a simple 6-character session code
  const generateSessionCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateSession = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    // Validate custom session code if provided
    if (useCustomCode) {
      if (!customSessionCode.trim()) {
        setError('Please enter a custom session code');
        return;
      }
      if (customSessionCode.length < 3 || customSessionCode.length > 8) {
        setError('Session code must be 3-8 characters');
        return;
      }
      // Check if session code already exists
      const existingSession = localStorage.getItem(`session_${customSessionCode.toUpperCase()}`);
      if (existingSession) {
        setError('This session code already exists. Please choose a different one.');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      const newSessionCode = useCustomCode ? customSessionCode.toUpperCase() : generateSessionCode();
      const sessionData = {
        sessionId: newSessionCode,
        hostName: participantName.trim(),
        participants: [{
          id: 'host',
          name: participantName.trim(),
          isHost: true,
          joinedAt: new Date().toISOString()
        }],
        createdAt: new Date().toISOString(),
        status: 'waiting',
        maxParticipants: 6,
        duration: 90, // Fixed 90 minutes
        breakoutRooms: {},
        // Track participant count separately (excluding host)
        participantCount: 0 // Host is not counted as a participant
      };

      // Store in localStorage for now (will move to Firebase later)
      localStorage.setItem(`session_${newSessionCode}`, JSON.stringify(sessionData));
      
      // Store participant name for host detection
      localStorage.setItem('gd_participant_name', participantName.trim());
      
      onJoinSession({
        ...sessionData,
        currentParticipant: sessionData.participants[0]
      });
    } catch (err) {
      setError('Failed to create session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!participantName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!sessionCode.trim()) {
      setError('Please enter a session code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Try to load session from localStorage
      const sessionData = localStorage.getItem(`session_${sessionCode.toUpperCase()}`);
      
      if (!sessionData) {
        setError('Session not found. Please check the code.');
        return;
      }

      const session = JSON.parse(sessionData);
      
      if (session.participants.length >= session.maxParticipants) {
        setError('Session is full (6 participants maximum)');
        return;
      }

      // DEVELOPMENT: Allow duplicate names for easier testing
      // Daily.co handles unique identities with suffixes automatically

      // Add participant to session
      const newParticipant = {
        id: `participant_${Date.now()}`,
        name: participantName.trim(),
        isHost: false,
        joinedAt: new Date().toISOString()
      };

      session.participants.push(newParticipant);
      localStorage.setItem(`session_${sessionCode.toUpperCase()}`, JSON.stringify(session));

      // Store participant name for host detection
      localStorage.setItem('gd_participant_name', participantName.trim());

      onJoinSession({
        ...session,
        currentParticipant: newParticipant
      });
    } catch (err) {
      setError('Failed to join session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  console.log('🎯 SessionJoin component rendering, isHost:', isHost, 'useCustomCode:', useCustomCode);
  
  return (
    <div className="session-join">
      <div className="join-container">
        <h1>🎯 Generative Dialogue</h1>
        <p>Join a 90-minute dialogue session with up to 6 participants</p>

        <div className="join-form">
          <div className="form-group">
            <label>Your Name</label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              maxLength={30}
              disabled={isLoading}
            />
          </div>

          {!isHost && (
            <div className="form-group">
              <label>Session Code</label>
              <input
                type="text"
                value={sessionCode}
                onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
                placeholder="Enter session code (e.g., LOGOS-1)"
                maxLength={8}
                disabled={isLoading}
              />
            </div>
          )}

          {isHost && (
            <div className="form-group">
              <div className="custom-code-option">
                <label>
                  <input
                    type="checkbox"
                    checked={useCustomCode}
                    onChange={(e) => setUseCustomCode(e.target.checked)}
                    disabled={isLoading}
                  />
                  Use custom session code
                </label>
              </div>
              {useCustomCode && (
                <div className="form-group">
                  <label>Custom Session Code</label>
                  <input
                    type="text"
                    value={customSessionCode}
                    onChange={(e) => setCustomSessionCode(e.target.value.toUpperCase())}
                    placeholder="Enter your custom code (3-8 chars)"
                    maxLength={8}
                    disabled={isLoading}
                  />
                </div>
              )}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="join-actions">
            {isHost ? (
              <button 
                className="create-session-btn"
                onClick={handleCreateSession}
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : '🚀 Create New Session'}
              </button>
            ) : (
              <button 
                className="join-session-btn"
                onClick={handleJoinSession}
                disabled={isLoading}
              >
                {isLoading ? 'Joining...' : '👥 Join Session'}
              </button>
            )}
          </div>

          <div className="join-toggle">
            <button 
              className="toggle-btn"
              onClick={() => {
                console.log('🎯 Toggle clicked! Current isHost:', isHost, 'Setting to:', !isHost);
                setIsHost(!isHost);
                setError(''); // Clear any errors when switching modes
                setUseCustomCode(false); // Reset custom code option
                setCustomSessionCode(''); // Clear custom code
              }}
              disabled={isLoading}
            >
              {isHost ? 'Join existing session instead' : '🎯 CREATE NEW SESSION INSTEAD'}
            </button>
          </div>
        </div>

        <div className="session-info">
          <h3>Session Format</h3>
          <ul>
            <li>📅 <strong>Duration:</strong> 90 minutes</li>
            <li>👥 <strong>Participants:</strong> Up to 6 people</li>
            <li>🎯 <strong>Structure:</strong> Connect → Explore → Discover</li>
            <li>💬 <strong>Features:</strong> Breakout rooms + AI transcription</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SessionJoin;




