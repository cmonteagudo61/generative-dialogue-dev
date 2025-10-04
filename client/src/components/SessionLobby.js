import React, { useState, useEffect } from 'react';
import './SessionLobby.css';
import { roomManager } from '../services/RoomManager';

const SessionLobby = ({ sessionData, onStartSession, onLeaveSession }) => {
  const [participants, setParticipants] = useState(sessionData.participants || []);
  const [sessionCode] = useState(sessionData.sessionId);
  const [copied, setCopied] = useState(false);
  const [roomAssignments, setRoomAssignments] = useState(null);
  const [isAssigningRooms, setIsAssigningRooms] = useState(false);
  const [currentSessionStatus, setCurrentSessionStatus] = useState(sessionData.status || 'waiting');

  // Host-only: clean duplicates and cap to 4 participants (host + 3)
  const handleCleanParticipants = () => {
    try {
      const storageKey = `session_${sessionCode}`;
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const data = JSON.parse(stored);
      const all = Array.isArray(data.participants) ? data.participants : [];
      // Always keep host first
      const host = all.find(p => p.isHost);
      const uniqueByName = new Map();
      all.forEach(p => {
        const key = (p.name || '').toLowerCase();
        if (!uniqueByName.has(key)) uniqueByName.set(key, p);
      });
      const uniques = Array.from(uniqueByName.values());
      // Ensure host present and first
      const nonHostUniques = uniques.filter(p => !p.isHost);
      const cleaned = [host, ...nonHostUniques].filter(Boolean).slice(0, 4);
      const updated = { ...data, participants: cleaned };
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setParticipants(cleaned);
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: { sessionCode: sessionCode, sessionData: updated }
      }));
      console.log('🧹 Cleaned participants to 4 uniques:', cleaned.map(p => p.name));
    } catch (e) {
      console.warn('Failed cleaning participants:', e);
    }
  };
  
  // CRITICAL FIX: Listen for session updates and sync participant list
  useEffect(() => {
    const handleSessionUpdate = (event) => {
      const { sessionCode: updatedSessionCode, sessionData: updatedSessionData } = event.detail;
      if (updatedSessionCode === sessionCode && updatedSessionData?.participants) {
        console.log('🔄 SessionLobby: Syncing participants from session update:', updatedSessionData.participants.length);
        setParticipants(updatedSessionData.participants);
        
        // ZOOM-LIKE WORKFLOW: Auto-navigate participants to video when session starts
        if (updatedSessionData.status === 'main-room-active' && currentSessionStatus !== 'main-room-active') {
          const currentParticipant = updatedSessionData.participants.find(p => 
            p.name === (sessionStorage.getItem('gd_current_participant_name') || '')
          );

          if (currentParticipant) {
            const urlName = encodeURIComponent(sessionStorage.getItem('gd_current_participant_name') || currentParticipant.name || '');
            console.log('🎥 SessionLobby: Session started! Auto-navigating to video session (including host)');
            window.location.href = `${window.location.origin}${window.location.pathname}?page=participant-session&session=${sessionCode}${urlName ? `&name=${urlName}` : ''}`;
          }

          setCurrentSessionStatus(updatedSessionData.status);
        }
      }
    };

    // Listen for session updates from other tabs/components
    window.addEventListener('session-updated', handleSessionUpdate);
    
    // Also check localStorage periodically for updates
    const checkForUpdates = () => {
      const storedSession = localStorage.getItem(`session_${sessionCode}`);
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession);
        
        // Check for participant count changes
        if (parsedSession.participants && parsedSession.participants.length !== participants.length) {
          console.log('🔄 SessionLobby: Syncing participants from localStorage:', parsedSession.participants.length);
          setParticipants(parsedSession.participants);
        }
        
        // Check for status changes (session start)
        if (parsedSession.status === 'main-room-active' && currentSessionStatus !== 'main-room-active') {
          const currentParticipant = parsedSession.participants.find(p => 
            p.name === (sessionStorage.getItem('gd_current_participant_name') || '')
          );
          if (currentParticipant) {
            const urlName = encodeURIComponent(sessionStorage.getItem('gd_current_participant_name') || currentParticipant.name || '');
            console.log('🎥 SessionLobby: Session started (localStorage)! Auto-navigating to video session (including host)');
            window.location.href = `${window.location.origin}${window.location.pathname}?page=participant-session&session=${sessionCode}${urlName ? `&name=${urlName}` : ''}`;
          }
          setCurrentSessionStatus(parsedSession.status);
        }
      }
    };
    
    const interval = setInterval(checkForUpdates, 2000); // Check every 2 seconds
    
    return () => {
      window.removeEventListener('session-updated', handleSessionUpdate);
      clearInterval(interval);
    };
  }, [sessionCode, participants.length]);
  // FIXED: More robust host detection - check multiple sources
  const currentParticipant = sessionData.currentParticipant || 
    participants.find(p => p.name === (sessionStorage.getItem('gd_current_participant_name') || '')) ||
    participants.find(p => p.isHost) || // Fallback to any host
    (sessionData.hostName && participants.find(p => p.name === sessionData.hostName)); // Match by host name
  const isHost = currentParticipant?.isHost || 
    (sessionData.hostName && (sessionStorage.getItem('gd_current_participant_name') || '') === sessionData.hostName) ||
    false;
  
  // Debug logging
  console.log('🔍 SessionLobby: Host detection debug:', {
    sessionDataCurrentParticipant: sessionData.currentParticipant,
    storedParticipantName: sessionStorage.getItem('gd_current_participant_name'),
    allParticipants: participants,
    detectedCurrentParticipant: currentParticipant,
    isHost: isHost,
    participantCount: participants.length
  });

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
    // Allow host to start session even if alone

    setIsAssigningRooms(true);
    
    try {
      console.log('🏠 SessionLobby: Starting session - sending everyone to main room first');
      // Prefer reusing an existing main room if present so all tabs join the SAME room
      let assignments = null;
      try {
        const storedSessionRaw = localStorage.getItem(`session_${sessionCode}`);
        const storedSession = storedSessionRaw ? JSON.parse(storedSessionRaw) : null;
        const existingAssignments = storedSession?.roomAssignments || null;
        const existingMainRoom = existingAssignments?.rooms?.['main'];

        if (existingMainRoom && existingMainRoom.url) {
          console.log('♻️ SessionLobby: Reusing existing main room:', existingMainRoom.name);
          // Rebuild participant mapping to point everyone to the existing main room
          const rebuiltParticipantAssignments = {};
          participants.forEach(p => {
            rebuiltParticipantAssignments[p.id] = {
              participantId: p.id,
              participantName: p.name,
              roomId: 'main',
              roomName: existingMainRoom.name,
              roomUrl: existingMainRoom.url,
              roomType: 'community',
              assignedAt: new Date().toISOString()
            };
          });

          assignments = {
            sessionId: sessionCode,
            rooms: {
              ...existingAssignments.rooms,
              main: {
                ...existingMainRoom,
                participants: participants.map(p => p.id),
                assignedAt: new Date().toISOString()
              }
            },
            participants: rebuiltParticipantAssignments,
            createdAt: existingAssignments.createdAt || new Date().toISOString()
          };
        } else {
          // No existing main room: create via API
          const allParticipants = participants;
          const roomConfiguration = { roomType: 'community', allowRoomSwitching: true };
          assignments = await roomManager.assignRoomsViaAPI(sessionCode, allParticipants, roomConfiguration);
          console.log('✅ SessionLobby: Created main room via API for all participants');
        }
      } catch (e) {
        console.warn('⚠️ SessionLobby: Failed to prepare main room assignments, continuing without explicit assignments:', e?.message);
      }
      
      // ZOOM-LIKE BEHAVIOR: Start everyone in the main room together
      // No breakout room assignments yet - host will create them later
      const updatedSession = {
        ...sessionData,
        participants: participants, // CRITICAL FIX: Use current participants state (includes all joined participants)
        status: 'main-room-active', // Everyone starts in main room
        startedAt: new Date().toISOString(),
        currentPhase: 'main-room', // Track that we're in main room phase
        breakoutRoomsAvailable: false, // No breakout rooms created yet
        ...(assignments ? { roomAssignments: assignments } : {})
      };

      localStorage.setItem(`session_${sessionCode}`, JSON.stringify(updatedSession));
      
      // Notify all participants to join main room
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: { sessionCode: sessionCode, sessionData: updatedSession }
      }));
      
      console.log('✅ SessionLobby: Session started - everyone joining main room');
      onStartSession(updatedSession);
      
    } catch (error) {
      console.error('❌ SessionLobby: Failed to start session:', error);
      alert(`Failed to start session: ${error.message}`);
    } finally {
      setIsAssigningRooms(false);
    }
  };

  // New: Explicit Join Main Room control for host if a main room exists already
  const handleHostJoinMainRoom = () => {
    try {
      const storedSessionRaw = localStorage.getItem(`session_${sessionCode}`);
      if (!storedSessionRaw) return;
      const storedSession = JSON.parse(storedSessionRaw);
      const mainRoom = storedSession?.roomAssignments?.rooms?.['main'];
      if (!mainRoom) return;

      // Build a minimal session payload to move host into participant-session
      const hostParticipant = (participants || []).find(p => p.isHost) || { id: 'host', name: storedSession?.hostName || 'Host', isHost: true };
      const updatedSession = {
        ...storedSession,
        currentParticipant: hostParticipant,
        status: storedSession.status || 'main-room-active',
        roomAssignments: storedSession.roomAssignments
      };

      // Persist and notify
      localStorage.setItem(`session_${sessionCode}`, JSON.stringify(updatedSession));
      window.dispatchEvent(new CustomEvent('session-updated', {
        detail: { sessionCode: sessionCode, sessionData: updatedSession }
      }));

      // Navigate to participant session (host)
      const urlName = encodeURIComponent(hostParticipant.name);
      window.location.href = `${window.location.origin}${window.location.pathname}?page=participant-session&session=${sessionCode}${urlName ? `&name=${urlName}` : ''}`;
    } catch (e) {
      console.warn('Failed host join main room:', e);
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

  // AUTO-JOIN: When room assignments exist, auto-join assigned room for non-hosts
  const autoJoinTriggeredRef = React.useRef(false);
  useEffect(() => {
    if (autoJoinTriggeredRef.current) return;
    if (!roomAssignments || !currentParticipant || currentParticipant.isHost) return;
    const myRoom = getMyAssignedRoom();
    if (myRoom) {
      autoJoinTriggeredRef.current = true;
      // Slight delay to allow UI updates
      setTimeout(() => handleJoinMyRoom(), 300);
    }
  }, [roomAssignments, currentParticipant]);

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
          <h2>Participants ({participants.filter(p => !p.isHost).length}/6)</h2>
            {isHost && (
              <div style={{ margin: '6px 0 10px 0' }}>
                <button
                  onClick={handleCleanParticipants}
                  style={{
                    background: '#edf2f7',
                    border: '1px solid #cbd5e0',
                    color: '#2d3748',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                  aria-label="Clean to 4 unique (Host + 3)"
                >
                  🧹 Clean to 4 unique
                </button>
              </div>
            )}
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
              {/* Visible host join button when a main room already exists */}
              {(() => {
                try {
                  const stored = JSON.parse(localStorage.getItem(`session_${sessionCode}`) || 'null');
                  const hasMain = !!stored?.roomAssignments?.rooms?.['main'];
                  return hasMain ? (
                    <div style={{ marginTop: 10 }}>
                      <button
                        onClick={handleHostJoinMainRoom}
                        style={{
                          background: '#2b6cb0',
                          color: 'white',
                          border: 'none',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        🎥 Join Main Room (Host)
                      </button>
                    </div>
                  ) : null;
                } catch (_) {
                  return null;
                }
              })()}
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
                    {!isHost && (
                      <button 
                        className="join-room-btn"
                        onClick={handleJoinMyRoom}
                      >
                        🎥 Join My Room
                      </button>
                    )}
                    {isHost && (
                      <div style={{ marginTop: 8, color: '#666' }}>
                        Host will auto-join after clicking "Start 90-Minute Dialogue".
                      </div>
                    )}
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
              disabled={isAssigningRooms}
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


