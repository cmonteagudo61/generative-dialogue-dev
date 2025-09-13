import React, { useState, useEffect } from 'react';
import { roomManager } from '../services/RoomManager';
import { ROOM_TYPES } from '../config/roomConfig';
import './RoomAssignmentManager.css';

const RoomAssignmentManager = ({ 
  sessionData, 
  onRoomAssignmentsReady, 
  onError 
}) => {
  const [assignments, setAssignments] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [roomStats, setRoomStats] = useState(null);

  useEffect(() => {
    // Load room stats on mount
    const stats = roomManager.getSystemStats();
    setRoomStats(stats);
  }, []);

  const assignRooms = async (roomType = ROOM_TYPES.DYAD) => {
    if (!sessionData || !sessionData.participants) {
      onError('No session data available for room assignment');
      return;
    }

    setIsAssigning(true);
    
    try {
      console.log('🏠 Starting room assignment process...');
      
      // CRITICAL: Exclude host from breakout room assignments (host stays in community view)
      // Only non-host participants get assigned to breakout rooms
      const participantsForAssignment = sessionData.participants.filter(p => !p.isHost);
      
      if (participantsForAssignment.length === 0) {
        onError('No participants to assign to rooms');
        setIsAssigning(false);
        return;
      }

      // Release any existing room assignments first
      roomManager.releaseSessionRooms(sessionData.sessionId);
      console.log('🏠 Released existing rooms before new assignment');

      // Create room configuration
      const roomConfiguration = {
        roomType,
        allowRoomSwitching: sessionData.roomConfiguration?.allowRoomSwitching || true
      };

      // Assign rooms using room manager
      const roomAssignments = await roomManager.assignRoomsForSession(
        sessionData.sessionId,
        participantsForAssignment,
        roomConfiguration
      );

      // CRITICAL: Ensure host gets assigned to main room (RoomManager creates it but we need to verify)
      const hostParticipant = sessionData.participants.find(p => p.isHost);
      if (hostParticipant && roomAssignments.rooms.main) {
        // Make sure host is assigned to main room
        if (!roomAssignments.participants[hostParticipant.id]) {
          roomAssignments.participants[hostParticipant.id] = {
            participantId: hostParticipant.id,
            participantName: hostParticipant.name,
            roomId: 'main',
            roomName: roomAssignments.rooms.main.name,
            roomUrl: roomAssignments.rooms.main.roomUrl,
            roomType: 'community',
            assignedAt: new Date().toISOString()
          };
          console.log('🏠 Host manually assigned to main room:', hostParticipant.name);
        }
      }

      setAssignments(roomAssignments);
      
      // Update session data with room assignments
      const updatedSessionData = {
        ...sessionData,
        roomAssignments,
        status: 'rooms-assigned'
      };
      
      // Save updated session data
      localStorage.setItem(
        `session_${sessionData.sessionId}`, 
        JSON.stringify(updatedSessionData)
      );

      console.log('✅ Room assignments complete:', roomAssignments);
      onRoomAssignmentsReady(roomAssignments);
      
    } catch (error) {
      console.error('❌ Room assignment failed:', error);
      onError(`Room assignment failed: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const reassignRooms = async (newRoomType) => {
    if (!assignments) return;
    
    // Release current rooms
    roomManager.releaseSessionRooms(sessionData.sessionId);
    
    // Assign new rooms
    await assignRooms(newRoomType);
  };

  const getRoomTypeDisplayName = (roomType) => {
    switch (roomType) {
      case ROOM_TYPES.DYAD: return 'Dyads (2 people)';
      case ROOM_TYPES.TRIAD: return 'Triads (3 people)';
      case ROOM_TYPES.QUAD: return 'Quads (4 people)';
      case ROOM_TYPES.KIVA: return 'Kivas (6 people)';
      default: return roomType;
    }
  };

  const calculateRoomsNeeded = (participantCount, roomType) => {
    const roomSize = roomManager.getRoomSize(roomType);
    return Math.ceil(participantCount / roomSize);
  };

  // CRITICAL: Only count non-host participants for room assignments
  // Host stays in community view and is not assigned to breakout rooms
  const participantCount = sessionData?.participants?.filter(p => !p.isHost).length || 0;

  return (
    <div className="room-assignment-manager">
      <div className="room-assignment-header">
        <h3>🏠 Room Assignment Manager</h3>
        <p>Session: <strong>{sessionData?.sessionId}</strong></p>
        <p>Participants to assign: <strong>{participantCount}</strong></p>
      </div>

      {roomStats && (
        <div className="room-stats">
          <h4>📊 Room System Status</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-label">Total Capacity:</span>
              <span className="stat-value">{roomStats.totalCapacity} people</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Available Rooms:</span>
              <span className="stat-value">{roomStats.availableRooms}/{roomStats.totalRooms}</span>
            </div>
          </div>
          
          <div className="room-type-stats">
            {Object.entries(roomStats.byType).map(([type, stats]) => (
              <div key={type} className="room-type-stat">
                <strong>{type}:</strong> {stats.available}/{stats.total} available
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="room-assignment-controls">
        <h4>🎯 Choose Room Configuration</h4>
        
        <div className="room-type-options">
          {Object.values(ROOM_TYPES).filter(type => type !== ROOM_TYPES.MAIN).map(roomType => {
            const roomsNeeded = calculateRoomsNeeded(participantCount, roomType);
            const availableRooms = roomStats?.byType[roomType]?.available || 0;
            const canAssign = roomsNeeded <= availableRooms;
            
            return (
              <button
                key={roomType}
                className={`room-type-option ${!canAssign ? 'disabled' : ''}`}
                onClick={() => assignRooms(roomType)}
                disabled={isAssigning || !canAssign}
              >
                <div className="room-type-name">{getRoomTypeDisplayName(roomType)}</div>
                <div className="room-type-details">
                  Needs {roomsNeeded} rooms, {availableRooms} available
                </div>
              </button>
            );
          })}
        </div>

        {isAssigning && (
          <div className="assigning-indicator">
            <div className="spinner"></div>
            <span>Assigning rooms...</span>
          </div>
        )}
      </div>

      {assignments && (
        <div className="assignment-results">
          <h4>✅ Room Assignments Complete</h4>
          
          <div className="assignment-summary">
            <p><strong>Rooms Created:</strong> {Object.keys(assignments.rooms).length}</p>
            <p><strong>Participants Assigned:</strong> {Object.keys(assignments.participants).length}</p>
          </div>

          <div className="room-list">
            {Object.values(assignments.rooms).map(room => (
              <div key={room.id} className="room-item">
                <div className="room-header">
                  <strong>{room.name}</strong>
                  <span className="room-type">{room.type}</span>
                </div>
                <div className="room-participants">
                  {room.participants.length} participants assigned
                </div>
                <div className="room-url">
                  <a href={room.url} target="_blank" rel="noopener noreferrer">
                    {room.url}
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="reassign-controls">
            <h5>🔄 Reassign Rooms</h5>
            {Object.values(ROOM_TYPES).filter(type => type !== ROOM_TYPES.MAIN).map(roomType => (
              <button
                key={roomType}
                onClick={() => reassignRooms(roomType)}
                disabled={isAssigning}
                className="reassign-button"
              >
                Switch to {getRoomTypeDisplayName(roomType)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomAssignmentManager;
