import React, { useState, useEffect, useRef } from 'react';
import { useVideo } from './VideoProvider';
import { roomManager } from '../services/RoomManager';
import './EnhancedVideoSession.css';

const EnhancedVideoSession = ({ sessionData, participantId, onLeaveSession }) => {
  const { callObject, joinRoom, leaveRoom, isConnected, participants, error } = useVideo();
  const [currentRoom, setCurrentRoom] = useState(null);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const [roomAssignment, setRoomAssignment] = useState(null);
  const videoContainerRef = useRef(null);

  // Get participant's room assignment
  useEffect(() => {
    if (sessionData?.sessionId && participantId) {
      const assignment = roomManager.getParticipantRoom(sessionData.sessionId, participantId);
      if (assignment) {
        setRoomAssignment(assignment);
        console.log('🏠 Participant room assignment:', assignment);
      } else {
        // Check if session has room assignments in localStorage
        const sessionKey = `session_${sessionData.sessionId}`;
        const storedSession = localStorage.getItem(sessionKey);
        if (storedSession) {
          const session = JSON.parse(storedSession);
          if (session.roomAssignments?.participants[participantId]) {
            const assignment = session.roomAssignments.participants[participantId];
            setRoomAssignment(assignment);
            console.log('🏠 Found room assignment in session data:', assignment);
          }
        }
      }
    }
  }, [sessionData, participantId]);

  // Auto-join assigned room
  useEffect(() => {
    if (roomAssignment && !hasJoined && !isJoining) {
      joinAssignedRoom();
    }
  }, [roomAssignment, hasJoined, isJoining]);

  const joinAssignedRoom = async () => {
    if (!roomAssignment?.roomUrl) {
      console.log('🏠 No room assignment available yet');
      return;
    }

    setIsJoining(true);
    setRoomError(null);

    try {
      console.log('🎥 Joining assigned Daily.co room:', roomAssignment.roomUrl);
      
      // Leave current room if connected
      if (isConnected && callObject) {
        await leaveRoom();
        setHasJoined(false);
      }

      // Join new room
      // FIXED: Pass participant name to Daily.co
      const currentParticipant = sessionData.participants?.find(p => p.id === participantId);
      const participantName = currentParticipant?.name || localStorage.getItem('gd_participant_name') || 'Participant';
      console.log('🎥 Enhanced session joining as:', participantName);
      
      await joinRoom(roomAssignment.roomUrl, participantName);
      setCurrentRoom(roomAssignment);
      setHasJoined(true);
      
      console.log('✅ Successfully joined room:', roomAssignment.roomName);
      
    } catch (error) {
      console.error('❌ Failed to join room:', error);
      setRoomError(error.message);
    } finally {
      setIsJoining(false);
    }
  };

  const switchRoom = async (newRoomUrl, newRoomName) => {
    if (!newRoomUrl) return;

    setIsJoining(true);
    setRoomError(null);

    try {
      console.log('🔄 Switching to room:', newRoomUrl);
      
      // Leave current room
      if (isConnected && callObject) {
        await leaveRoom();
        setHasJoined(false);
      }

      // Join new room
      // FIXED: Pass participant name to Daily.co
      const currentParticipant = sessionData.participants?.find(p => p.id === participantId);
      const participantName = currentParticipant?.name || localStorage.getItem('gd_participant_name') || 'Participant';
      console.log('🎥 Enhanced session switching room as:', participantName);
      
      await joinRoom(newRoomUrl, participantName);
      setCurrentRoom({ roomUrl: newRoomUrl, roomName: newRoomName });
      setHasJoined(true);
      
      console.log('✅ Successfully switched to room:', newRoomName);
      
    } catch (error) {
      console.error('❌ Failed to switch rooms:', error);
      setRoomError(error.message);
    } finally {
      setIsJoining(false);
    }
  };

  // Listen for room assignment changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `session_${sessionData?.sessionId}`) {
        const updatedSession = JSON.parse(e.newValue);
        if (updatedSession?.roomAssignments?.participants[participantId]) {
          const newAssignment = updatedSession.roomAssignments.participants[participantId];
          if (newAssignment.roomUrl !== roomAssignment?.roomUrl) {
            setRoomAssignment(newAssignment);
            console.log('🔄 Room assignment updated:', newAssignment);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [sessionData?.sessionId, participantId, roomAssignment]);

  // Create Daily.co iframe when connected
  useEffect(() => {
    if (isConnected && currentRoom?.roomUrl && videoContainerRef.current) {
      // Clear existing content
      videoContainerRef.current.innerHTML = '';
      
      // Create Daily.co iframe
      const iframe = document.createElement('iframe');
      iframe.src = currentRoom.roomUrl;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.allow = 'microphone; camera; autoplay; fullscreen; display-capture';
      iframe.allowFullscreen = true;
      
      videoContainerRef.current.appendChild(iframe);
      
      console.log('🎥 Daily.co iframe created for room:', currentRoom.roomName);
    }
  }, [isConnected, currentRoom?.roomUrl]);

  const handleLeaveSession = () => {
    if (isConnected && callObject) {
      leaveRoom();
    }
    onLeaveSession();
  };

  return (
    <div className="enhanced-video-session">
      {/* Room Status Header */}
      <div className="room-status-header">
        <div className="session-info">
          <h3>Session: {sessionData?.sessionId}</h3>
          <p>Participant: <strong>{sessionData?.participants?.find(p => p.id === participantId)?.name}</strong></p>
        </div>
        
        <div className="room-info">
          {currentRoom ? (
            <div className="current-room">
              <span className="room-label">Current Room:</span>
              <span className="room-name">{currentRoom.roomName}</span>
              <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
              </div>
            </div>
          ) : (
            <div className="no-room">
              <span className="room-label">Status:</span>
              <span className="waiting-assignment">Waiting for room assignment...</span>
            </div>
          )}
        </div>
      </div>

      {/* Room Assignment Info */}
      {roomAssignment && (
        <div className="room-assignment-info">
          <div className="assignment-details">
            <strong>Assigned Room:</strong> {roomAssignment.roomName}
            <br />
            <small>Assigned at: {new Date(roomAssignment.assignedAt).toLocaleTimeString()}</small>
          </div>
          
          {!hasJoined && (
            <button 
              onClick={joinAssignedRoom}
              disabled={isJoining}
              className="join-room-button"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          )}
        </div>
      )}

      {/* Error Display */}
      {roomError && (
        <div className="room-error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{roomError}</span>
          <button onClick={() => setRoomError(null)} className="dismiss-error">×</button>
        </div>
      )}

      {/* Loading State */}
      {isJoining && (
        <div className="joining-indicator">
          <div className="spinner"></div>
          <span>Connecting to room...</span>
        </div>
      )}

      {/* Video Container */}
      <div className="video-container">
        {hasJoined && currentRoom ? (
          <div ref={videoContainerRef} className="daily-iframe-container">
            {/* Daily.co iframe will be inserted here */}
          </div>
        ) : (
          <div className="video-placeholder">
            {roomAssignment ? (
              <div className="waiting-to-join">
                <div className="placeholder-icon">🎥</div>
                <h3>Ready to Join</h3>
                <p>Room: {roomAssignment.roomName}</p>
                <button 
                  onClick={joinAssignedRoom}
                  disabled={isJoining}
                  className="join-button-large"
                >
                  {isJoining ? 'Joining...' : 'Join Video Call'}
                </button>
              </div>
            ) : (
              <div className="waiting-assignment">
                <div className="placeholder-icon">⏳</div>
                <h3>Waiting for Room Assignment</h3>
                <p>The host will assign you to a breakout room shortly.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Room Switching (for testing) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="dev-room-switcher">
          <h4>🔧 Dev: Quick Room Switch</h4>
          <div className="quick-switch-buttons">
            <button onClick={() => switchRoom('https://generative-dialogue.daily.co/MainRoom', 'Main Room')}>
              Main Room
            </button>
            <button onClick={() => switchRoom('https://generative-dialogue.daily.co/Dyad1', 'Dyad 1')}>
              Dyad 1
            </button>
            <button onClick={() => switchRoom('https://generative-dialogue.daily.co/Dyad2', 'Dyad 2')}>
              Dyad 2
            </button>
            <button onClick={() => switchRoom('https://generative-dialogue.daily.co/Triad1', 'Triad 1')}>
              Triad 1
            </button>
          </div>
        </div>
      )}

      {/* Session Controls */}
      <div className="session-controls">
        <button onClick={handleLeaveSession} className="leave-session-button">
          Leave Session
        </button>
      </div>
    </div>
  );
};

export default EnhancedVideoSession;

