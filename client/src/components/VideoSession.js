import React, { useState, useEffect, useRef } from 'react';
import { useVideo } from './VideoProvider';
import './VideoSession.css';

const VideoSession = ({ sessionData, onLeaveSession }) => {
  const { callObject, joinRoom, isConnected, participants, error } = useVideo();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [roomError, setRoomError] = useState(null);
  const videoContainerRef = useRef(null);

  // Auto-join Daily.co room when session starts
  useEffect(() => {
    console.log('🎯 VideoSession useEffect - sessionData:', sessionData);
    const joinDailyRoom = async () => {
      if (!sessionData?.dailyRoom?.url || hasJoined || isJoining) {
        return;
      }

      console.log('🎥 VideoSession: Attempting to join Daily.co room:', {
        roomName: sessionData.dailyRoom.name,
        roomUrl: sessionData.dailyRoom.url,
        roomType: sessionData.dailyRoom.type
      });

      setIsJoining(true);
      setRoomError(null);

      try {
        // For real Daily.co rooms created via API, join directly
        console.log('🎥 Joining real Daily.co room:', sessionData.dailyRoom.url);
        
        // FIXED: Pass current participant name to Daily.co
        const currentParticipant = sessionData.currentParticipant;
        const participantName = currentParticipant?.name || localStorage.getItem('gd_participant_name') || 'Participant';
        console.log('🎥 Joining as:', participantName);
        
        await joinRoom(sessionData.dailyRoom.url, participantName);
        setHasJoined(true);
        console.log('✅ Successfully joined Daily.co room');
      } catch (error) {
        console.error('❌ Failed to join Daily.co room:', error);
        setRoomError(error.message);
      } finally {
        setIsJoining(false);
      }
    };

    // Listen for localStorage changes (cross-tab notifications)
    const handleStorageChange = (event) => {
      console.log('📢 VideoSession: Storage event received:', event.key, event.newValue);
      
      // Check if this is a session notification
      if (event.key && event.key.startsWith('session_notification_') && event.newValue) {
        try {
          const notificationData = JSON.parse(event.newValue);
          console.log('🔔 VideoSession: Notification data:', notificationData);
          
          if (notificationData.type === 'session-started' && 
              notificationData.sessionCode === sessionData?.sessionCode) {
            console.log('🎥 VideoSession: Session started for our session! Daily.co room:', notificationData.dailyRoom.url);
            
            // Update localStorage with Daily.co room info
            const sessionKey = `session_${sessionData.sessionCode}`;
            const currentSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
            const updatedSession = {
              ...currentSession,
              dailyRoom: notificationData.dailyRoom,
              status: 'active',
              startedAt: new Date().toISOString()
            };
            localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
            
            // Update session data and trigger join
            sessionData.dailyRoom = notificationData.dailyRoom;
            sessionData.status = 'active';
            
            console.log('🎥 VideoSession: About to join Daily.co room');
            joinDailyRoom();
          }
        } catch (error) {
          console.error('❌ VideoSession: Error parsing notification:', error);
        }
      }
    };

    // Listen for storage events (cross-tab communication)
    window.addEventListener('storage', handleStorageChange);
    
    // Also try to join immediately if room info is available
    if (sessionData?.dailyRoom?.url) {
      joinDailyRoom();
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [sessionData, joinRoom, hasJoined, isJoining]);

  // Create Daily.co iframe when connected
  useEffect(() => {
    if (hasJoined && sessionData?.dailyRoom?.url && videoContainerRef.current) {
      // Clear existing content
      videoContainerRef.current.innerHTML = '';
      
      // Create real Daily.co iframe for API-created rooms
      const iframe = document.createElement('iframe');
      iframe.src = sessionData.dailyRoom.url;
      iframe.width = '100%';
      iframe.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';
      iframe.allow = 'microphone; camera; autoplay; fullscreen; display-capture';
      iframe.allowFullscreen = true;
      
      videoContainerRef.current.appendChild(iframe);
      console.log('🎥 Daily.co iframe created for room:', sessionData.dailyRoom.name);
    }
  }, [hasJoined, sessionData?.dailyRoom?.url, sessionData?.dailyRoom?.name]);

  if (!sessionData) {
    return (
      <div className="video-session error">
        <h2>❌ No Session Data</h2>
        <p>Unable to load session information.</p>
        <button onClick={onLeaveSession}>← Back to Main</button>
      </div>
    );
  }

  return (
    <div className="video-session">
      <div className="session-header">
        <div className="session-info">
          <h1>🎯 {sessionData.title}</h1>
          <div className="session-details">
            <span className="session-code">Session: {sessionData.sessionCode}</span>
            <span className="participant-count">👥 {sessionData.participants?.length || 0} participants</span>
            <span className="duration">⏱️ {sessionData.duration} minutes</span>
          </div>
        </div>
        <button className="leave-btn" onClick={onLeaveSession}>
          ← Leave Session
        </button>
      </div>

      <div className="video-container" ref={videoContainerRef}>
        {!sessionData.dailyRoom?.url && (
          <div className="waiting-room">
            <div className="waiting-content">
              <div className="spinner"></div>
              <h2>🎬 Waiting for Session to Start</h2>
              <p>The host will start the video session shortly...</p>
              <div className="session-preview">
                <h3>Session Overview:</h3>
                <div className="stage-timeline">
                  <div className="stage">
                    <span className="stage-name">Connect</span>
                    <span className="stage-duration">25 min</span>
                  </div>
                  <div className="stage">
                    <span className="stage-name">Explore</span>
                    <span className="stage-duration">30 min</span>
                  </div>
                  <div className="stage">
                    <span className="stage-name">Discover</span>
                    <span className="stage-duration">30 min</span>
                  </div>
                  <div className="stage">
                    <span className="stage-name">Closing</span>
                    <span className="stage-duration">5 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isJoining && (
          <div className="joining-overlay">
            <div className="joining-content">
              <div className="spinner"></div>
              <h2>🎥 Joining Video Session...</h2>
              <p>Connecting to Daily.co room...</p>
            </div>
          </div>
        )}

        {roomError && (
          <div className="error-overlay">
            <div className="error-content">
              <h2>❌ Connection Error</h2>
              <p>{roomError}</p>
              <button onClick={() => window.location.reload()}>
                🔄 Retry
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="error-overlay">
            <div className="error-content">
              <h2>❌ Video Error</h2>
              <p>{error}</p>
              <button onClick={() => window.location.reload()}>
                🔄 Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {isConnected && (
        <div className="session-controls">
          <div className="participant-list">
            <h3>👥 Participants ({participants.length})</h3>
            <div className="participants">
              {participants.map((participant, index) => (
                <div key={participant.session_id || index} className="participant">
                  <span className="participant-name">
                    {participant.user_name || `Participant ${index + 1}`}
                  </span>
                  {participant.local && <span className="you-badge">You</span>}
                </div>
              ))}
            </div>
          </div>
          
          <div className="session-status">
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className="status-value connected">🟢 Connected</span>
            </div>
            <div className="status-item">
              <span className="status-label">Room:</span>
              <span className="status-value">{sessionData.dailyRoom?.name}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoSession;
