import React, { useState, useEffect } from 'react';
import './SessionLobby.css';
import { roomManager } from '../services/RoomManager';

const SessionLobby = ({ sessionData, onStartSession, onLeaveSession }) => {
  const [participants, setParticipants] = useState(sessionData.participants || []);
  const [sessionCode] = useState(sessionData.sessionId);
  const [copied, setCopied] = useState(false);
  const [roomAssignments, setRoomAssignments] = useState(null);
  const [isAssigningRooms, setIsAssigningRooms] = useState(false);
  const currentParticipant = sessionData.currentParticipant;
  const isHost = currentParticipant?.isHost;

  // Poll for new participants and room assignments
  useEffect(() => {
    const pollInterval = setInterval(() => {
      const storedSessionData = localStorage.getItem(`session_${sessionCode}`);
      if (storedSessionData) {
        const session = JSON.parse(storedSessionData);
        setParticipants(session.participants || []);
        
        // Check for room assignments
        if (session.roomAssignments) {
          setRoomAssignments(session.roomAssignments);
          console.log('🏠 SessionLobby: Room assignments detected:', session.roomAssignments);
          console.log('🔍 SessionLobby: Current participant check:', {
            currentParticipant: currentParticipant,
            sessionCurrentParticipant: session.currentParticipant,
            allParticipants: session.participants
          });
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [sessionCode, currentParticipant]);

  const copySessionCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartSession = async () => {
    if (participants.length < 2) {
      alert('Need at least 2 participants to start the session');
      return;
    }

    setIsAssigningRooms(true);
    
    try {
      // Create Daily.co room assignments using the room manager
      console.log('🏠 SessionLobby: Creating room assignments for', participants.length, 'participants');
      
      const roomConfiguration = {
        roomType: 'dyad', // Default to dyads for Connect phase
        allowRoomSwitching: true
      };
      
      const assignments = await roomManager.assignRoomsForSession(
        sessionCode,
        participants,
        roomConfiguration
      );
      
      console.log('✅ SessionLobby: Room assignments created:', assignments);
      
      const updatedSession = {
        ...sessionData,
        participants,
        roomAssignments: assignments,
        status: 'rooms-assigned',
        startedAt: new Date().toISOString()
      };

      localStorage.setItem(`session_${sessionCode}`, JSON.stringify(updatedSession));
      
      // Notify all participants of room assignments
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: { sessionCode: sessionCode, sessionData: updatedSession }
      }));
      
      setRoomAssignments(assignments);
      onStartSession(updatedSession);
      
    } catch (error) {
      console.error('❌ SessionLobby: Failed to create room assignments:', error);
      alert(`Failed to create rooms: ${error.message}`);
    } finally {
      setIsAssigningRooms(false);
    }
  };

  const createBreakoutRooms = (participants) => {
    const rooms = {};
    
    // For 6 participants, create 3 dyad rooms
    // For fewer participants, adjust accordingly
    const participantCount = participants.length;
    const roomCount = Math.ceil(participantCount / 2); // Dyads
    
    // Create rooms
    for (let i = 0; i < roomCount; i++) {
      const roomId = `room_${i + 1}`;
      rooms[roomId] = {
        id: roomId,
        name: `Dyad ${i + 1}`,
        type: 'dyad',
        participants: [],
        maxParticipants: 2,
        dailyRoomUrl: null, // Will be created when needed
        status: 'waiting'
      };
    }

    // Assign participants to rooms
    participants.forEach((participant, index) => {
      const roomIndex = Math.floor(index / 2);
      const roomId = `room_${roomIndex + 1}`;
      if (rooms[roomId]) {
        rooms[roomId].participants.push(participant.id);
      }
    });

    return rooms;
  };

  const getSessionUrl = () => {
    return `${window.location.origin}${window.location.pathname}?session=${sessionCode}`;
  };

  const getMyAssignedRoom = () => {
    if (!roomAssignments || !currentParticipant) {
      console.log('🔍 SessionLobby: Missing data for room assignment:', {
        hasRoomAssignments: !!roomAssignments,
        hasCurrentParticipant: !!currentParticipant,
        participantId: currentParticipant?.id
      });
      return null;
    }
    
    // Check if participant has a room assignment in the roomAssignments data
    let myAssignment = roomAssignments.participants?.[currentParticipant.id];
    if (myAssignment) {
      console.log('🏠 SessionLobby: Found room assignment for participant by ID:', myAssignment);
      return myAssignment;
    }
    
    // FALLBACK: If ID lookup fails, try to find by participant name
    // This handles cases where participant joined after room assignments were created
    if (roomAssignments.participants) {
      const assignmentByName = Object.values(roomAssignments.participants).find(assignment => {
        // Get the participant from the original session data used for room assignments
        const originalParticipants = sessionData.participants || [];
        const originalParticipant = originalParticipants.find(p => p.id === assignment.participantId);
        return originalParticipant && originalParticipant.name === currentParticipant.name;
      });
      
      if (assignmentByName) {
        console.log('🏠 SessionLobby: Found room assignment for participant by name:', assignmentByName);
        return assignmentByName;
      }
    }
    
    console.log('🔍 SessionLobby: No room assignment found for participant:', {
      participantId: currentParticipant.id,
      participantName: currentParticipant.name,
      availableAssignments: Object.keys(roomAssignments.participants || {}),
      allAssignments: roomAssignments.participants
    });
    return null;
  };

  const handleJoinMyRoom = () => {
    const myRoom = getMyAssignedRoom();
    if (myRoom) {
      console.log('🎥 SessionLobby: Joining assigned room:', myRoom);
      // Navigate to video session with room info
      const updatedSessionData = {
        ...sessionData,
        dailyRoom: myRoom,
        status: 'active'
      };
      onStartSession(updatedSessionData);
    }
  };

  return (
    <div className="session-lobby">
      <div className="lobby-container">
        <div className="lobby-header">
          <h1>🎯 Session Lobby</h1>
          <div className="session-code-display">
            <span>Session Code: <strong>{sessionCode}</strong></span>
            <button className="copy-btn" onClick={copySessionCode}>
              {copied ? '✅ Copied!' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div className="lobby-content">
          <div className="participants-section">
            <h2>Participants ({participants.length}/6)</h2>
            <div className="participants-grid">
              {participants.map((participant) => (
                <div key={participant.id} className="participant-card">
                  <div className="participant-avatar">
                    {participant.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="participant-info">
                    <span className="participant-name">{participant.name}</span>
                    {participant.isHost && <span className="host-badge">Host</span>}
                  </div>
                </div>
              ))}
              
              {/* Empty slots */}
              {Array.from({ length: 6 - participants.length }).map((_, index) => (
                <div key={`empty-${index}`} className="participant-card empty">
                  <div className="participant-avatar empty">
                    +
                  </div>
                  <div className="participant-info">
                    <span className="participant-name">Waiting...</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="host-section">
              <h3>Share Session</h3>
              <div className="share-options">
                <div className="share-url">
                  <input 
                    type="text" 
                    value={getSessionUrl()} 
                    readOnly 
                    onClick={(e) => e.target.select()}
                  />
                  <button onClick={() => {
                    navigator.clipboard.writeText(getSessionUrl());
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}>
                    {copied ? '✅' : '🔗'}
                  </button>
                </div>
                <p>Share this link with participants, or have them enter code: <strong>{sessionCode}</strong></p>
              </div>
            </div>
          )}

          <div className="session-details">
            <h3>Session Plan</h3>
            <div className="session-timeline">
              <div className="timeline-item">
                <span className="timeline-phase">Connect</span>
                <span className="timeline-duration">25 min</span>
                <span className="timeline-description">Build initial connections (dyads)</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-phase">Explore</span>
                <span className="timeline-duration">30 min</span>
                <span className="timeline-description">Deeper sharing (dyads)</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-phase">Discover</span>
                <span className="timeline-duration">30 min</span>
                <span className="timeline-description">Synthesis & insights (triads)</span>
              </div>
              <div className="timeline-item">
                <span className="timeline-phase">Closing</span>
                <span className="timeline-duration">5 min</span>
                <span className="timeline-description">Harvest & reflection</span>
              </div>
            </div>
          </div>
        </div>

        {/* Room Assignment Section */}
        {roomAssignments && (
          <div className="room-assignments-section">
            <h3>🏠 Room Assignments</h3>
            <div className="my-room-info">
              {(() => {
                const myRoom = getMyAssignedRoom();
                console.log('🔍 SessionLobby: Rendering room assignment UI:', {
                  hasMyRoom: !!myRoom,
                  myRoom: myRoom,
                  currentParticipant: currentParticipant,
                  roomAssignments: roomAssignments
                });
                return myRoom ? (
                  <div className="assigned-room">
                    <div className="room-details">
                      <h4>{myRoom.roomName}</h4>
                      <p>Room Type: {myRoom.roomType}</p>
                      <p>Room URL: <a href={myRoom.roomUrl} target="_blank" rel="noopener noreferrer">Join Room</a></p>
                    </div>
                    <button 
                      className="join-room-btn"
                      onClick={handleJoinMyRoom}
                    >
                      🎥 Join My Room
                    </button>
                  </div>
                ) : (
                  <div className="no-room-assigned">
                    <p>⏳ You joined after room assignments were created.</p>
                    <p>Ask the host to reassign rooms to include you!</p>
                    {isHost && (
                      <button 
                        className="reassign-btn"
                        onClick={() => window.location.reload()}
                      >
                        🔄 Reassign Rooms (Host)
                      </button>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        <div className="lobby-actions">
          {isHost ? (
            <button 
              className="start-session-btn"
              onClick={handleStartSession}
              disabled={participants.length < 2 || isAssigningRooms}
            >
              {isAssigningRooms ? '🔄 Creating Rooms...' : '🚀 Start 90-Minute Dialogue'}
            </button>
          ) : roomAssignments ? (
            <div className="participant-ready">
              <p>✅ Rooms are ready! Click "Join My Room" above to start.</p>
            </div>
          ) : (
            <div className="waiting-message">
              <p>Waiting for host to start the session...</p>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          
          <button className="leave-btn" onClick={onLeaveSession}>
            ← Leave Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionLobby;


