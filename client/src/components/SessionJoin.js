import React, { useState, useEffect } from 'react';
import './SessionJoin.css';

const SessionJoin = ({ onJoinSession, sessionId = null }) => {
  const [participantName, setParticipantName] = useState('');
  const [sessionCode, setSessionCode] = useState(sessionId || '');
  const [isHost, setIsHost] = useState(false);
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

    setIsLoading(true);
    setError('');

    try {
      const newSessionCode = generateSessionCode();
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
        maxParticipants: 16,
        duration: 90, // Fixed 90 minutes
        breakoutRooms: {}
      };

      // Store in localStorage for now (will move to Firebase later)
      localStorage.setItem(`session_${newSessionCode}`, JSON.stringify(sessionData));
      
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
        setError(`Session is full (${session.participants.length}/${session.maxParticipants}). Please contact your host.`);
        return;
      }

      // REMOVED: Allow duplicate names for testing
      // Note: Daily.co handles unique identities with suffixes
      // if (session.participants.some(p => p.name.toLowerCase() === participantName.trim().toLowerCase())) {
      //   setError('Name already taken. Please choose a different name.');
      //   return;
      // }

      // Add participant to session
      const newParticipant = {
        id: `participant_${Date.now()}`,
        name: participantName.trim(),
        isHost: false,
        joinedAt: new Date().toISOString()
      };

      session.participants.push(newParticipant);
      localStorage.setItem(`session_${sessionCode.toUpperCase()}`, JSON.stringify(session));

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
                placeholder="Enter 6-character code"
                maxLength={6}
                disabled={isLoading}
              />
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
              onClick={() => setIsHost(!isHost)}
              disabled={isLoading}
            >
              {isHost ? 'Join existing session instead' : 'Create new session instead'}
            </button>
          </div>
        </div>

        <div className="session-info">
          <h3>Session Format</h3>
          <ul>
            <li>📅 <strong>Duration:</strong> 90 minutes</li>
            <li>👥 <strong>Participants:</strong> Up to 16 people</li>
            <li>🎯 <strong>Structure:</strong> Connect → Explore → Discover</li>
            <li>💬 <strong>Features:</strong> Breakout rooms + AI transcription</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SessionJoin;




