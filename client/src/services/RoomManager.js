// Room Manager Service - Abstraction layer for room management
// Supports both manual room pools and API-based room creation
// Easy migration path from manual to API

import { ROOM_POOL, ROOM_TYPES, USE_API_ROOMS } from '../config/roomConfig';

// Daily.co API configuration
const DAILY_API_KEY = process.env.REACT_APP_DAILY_API_KEY;
const DAILY_DOMAIN = process.env.REACT_APP_DAILY_DOMAIN || 'generativedialogue.daily.co';
// Enable API mode if explicitly requested or if an API key is present
const USE_DAILY_API = (process.env.REACT_APP_USE_DAILY_API === 'true') || !!DAILY_API_KEY;
const DEBUG_ROOMS = process.env.REACT_APP_DEBUG_ROOMS === 'true' || true; // Enable debug logging

class RoomManager {
  constructor() {
    this.activeRooms = new Map(); // sessionId -> room assignments
    this.roomUsage = new Map(); // roomId -> usage info
    this.initializeRoomUsage();
  }

  initializeRoomUsage() {
    // Initialize usage tracking for all rooms
    Object.values(ROOM_POOL).flat().forEach(room => {
      this.roomUsage.set(room.id, {
        participants: [],
        sessionId: null,
        assignedAt: null,
        status: 'available'
      });
    });
  }

  // Main method to assign rooms for a session
  async assignRoomsForSession(sessionId, participants, roomConfiguration) {
    console.log(`🏠 Assigning rooms for session ${sessionId}:`, {
      participantCount: participants.length,
      configuration: roomConfiguration,
      usingAPI: USE_DAILY_API
    });

    if (USE_DAILY_API && DAILY_API_KEY) {
      return await this.assignRoomsViaAPI(sessionId, participants, roomConfiguration);
    } else {
      console.log('🏠 Using manual room pool (API disabled or no API key)');
      return await this.assignRoomsFromPool(sessionId, participants, roomConfiguration);
    }
  }

  // Manual room pool assignment (MVP approach)
  async assignRoomsFromPool(sessionId, participants, roomConfiguration) {
    const assignments = {
      sessionId,
      rooms: {},
      participants: {},
      createdAt: new Date().toISOString()
    };

    // Always assign main room for community phases
    const mainRoom = this.getAvailableRoom(ROOM_TYPES.MAIN);
    if (mainRoom) {
      assignments.rooms['main'] = {
        ...mainRoom,
        participants: [], // Host-only during breakouts
        sessionId,
        assignedAt: new Date().toISOString()
      };
      this.markRoomAsUsed(mainRoom.id, sessionId);
    }

    // Assign breakout rooms based on configuration
    const breakoutAssignments = this.createBreakoutAssignments(
      participants, 
      roomConfiguration.roomType, 
      sessionId
    );

    // Merge breakout assignments
    Object.assign(assignments.rooms, breakoutAssignments.rooms);
    Object.assign(assignments.participants, breakoutAssignments.participants);

    // Store session assignments
    this.activeRooms.set(sessionId, assignments);

    console.log(`✅ Room assignment complete for session ${sessionId}:`, {
      totalRooms: Object.keys(assignments.rooms).length,
      participantAssignments: Object.keys(assignments.participants).length
    });

    return assignments;
  }

  // Create breakout room assignments
  createBreakoutAssignments(participants, roomType, sessionId) {
    const assignments = { rooms: {}, participants: {} };
    
    // CRITICAL: Separate host from other participants
    const hostParticipant = participants.find(p => p.isHost);
    const nonHostParticipants = participants.filter(p => !p.isHost);
    
    // Host stays in main room (community view) - no special assignment needed
    // Host can optionally visit breakout rooms but isn't assigned by default
    if (hostParticipant) {
      console.log('🏠 Host will remain in community view (main room):', hostParticipant.name);
    }
    
    // If no non-host participants, return early
    if (nonHostParticipants.length === 0) {
      console.log('⚠️ No non-host participants for breakout rooms');
      return assignments;
    }
    
    // Determine room size based on type
    const roomSize = this.getRoomSize(roomType);
    const availableRooms = this.getAvailableRoomsByType(roomType);
    
    // Calculate number of rooms needed (only for non-host participants)
    const roomsNeeded = Math.ceil(nonHostParticipants.length / roomSize);
    
    if (availableRooms.length < roomsNeeded) {
      throw new Error(`Not enough ${roomType} rooms available. Need ${roomsNeeded}, have ${availableRooms.length}`);
    }

    // Shuffle non-host participants for random assignment
    const shuffledParticipants = [...nonHostParticipants].sort(() => Math.random() - 0.5);
    
    // Assign participants to rooms
    for (let i = 0; i < roomsNeeded; i++) {
      const room = availableRooms[i];
      const roomParticipants = shuffledParticipants.slice(
        i * roomSize, 
        Math.min((i + 1) * roomSize, shuffledParticipants.length)
      );

      if (roomParticipants.length > 0) {
        // Assign room
        assignments.rooms[room.id] = {
          ...room,
          participants: roomParticipants.map(p => p.id),
          sessionId,
          assignedAt: new Date().toISOString()
        };

        // Mark room as used
        this.markRoomAsUsed(room.id, sessionId);

        // Assign participants to room
        roomParticipants.forEach(participant => {
          assignments.participants[participant.id] = {
            participantId: participant.id,
            roomId: room.id,
            roomUrl: room.url,
            roomName: room.name,
            assignedAt: new Date().toISOString()
          };
        });
      }
    }

    return assignments;
  }

  // Get available room by type
  getAvailableRoom(roomType) {
    const rooms = ROOM_POOL[roomType] || [];
    return rooms.find(room => {
      const usage = this.roomUsage.get(room.id);
      return usage && usage.status === 'available';
    });
  }

  // Get available rooms by type
  getAvailableRoomsByType(roomType) {
    const rooms = ROOM_POOL[roomType] || [];
    const availableRooms = rooms.filter(room => {
      const usage = this.roomUsage.get(room.id);
      return usage && usage.status === 'available';
    });
    
    // Debug logging for room availability
    console.log(`🏠 Room availability check for ${roomType}:`, {
      totalRooms: rooms.length,
      availableRooms: availableRooms.length,
      roomIds: availableRooms.map(r => r.id)
    });
    
    return availableRooms;
  }

  // Mark room as used
  markRoomAsUsed(roomId, sessionId) {
    const usage = this.roomUsage.get(roomId);
    if (usage) {
      usage.status = 'in-use';
      usage.sessionId = sessionId;
      usage.assignedAt = new Date().toISOString();
    }
  }

  // Release room
  releaseRoom(roomId) {
    const usage = this.roomUsage.get(roomId);
    if (usage) {
      usage.status = 'available';
      usage.sessionId = null;
      usage.participants = [];
      usage.assignedAt = null;
    }
  }

  // Release all rooms for a session
  releaseSessionRooms(sessionId) {
    const assignments = this.activeRooms.get(sessionId);
    if (assignments) {
      const roomIds = Object.keys(assignments.rooms);
      console.log(`🏠 Releasing ${roomIds.length} rooms for session ${sessionId}:`, roomIds);
      
      roomIds.forEach(roomId => {
        this.releaseRoom(roomId);
        console.log(`  ✅ Released room: ${roomId}`);
      });
      
      this.activeRooms.delete(sessionId);
      console.log(`🏠 All rooms released for session ${sessionId}`);
    } else {
      console.log(`🏠 No rooms to release for session ${sessionId} (no active assignments)`);
    }
  }

  // Get room assignments for a session
  getSessionRooms(sessionId) {
    return this.activeRooms.get(sessionId);
  }

  // Get participant's current room assignment
  getParticipantRoom(sessionId, participantId) {
    const assignments = this.activeRooms.get(sessionId);
    if (assignments && assignments.participants[participantId]) {
      return assignments.participants[participantId];
    }
    return null;
  }

  // Reassign participant to different room (for room switching)
  async reassignParticipant(sessionId, participantId, newRoomType) {
    const assignments = this.activeRooms.get(sessionId);
    if (!assignments) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Find available room of the requested type
    const newRoom = this.getAvailableRoom(newRoomType);
    if (!newRoom) {
      throw new Error(`No available ${newRoomType} rooms`);
    }

    // Update participant assignment
    assignments.participants[participantId] = {
      participantId,
      roomId: newRoom.id,
      roomUrl: newRoom.url,
      roomName: newRoom.name,
      assignedAt: new Date().toISOString()
    };

    return assignments.participants[participantId];
  }

  // Helper methods
  getRoomSize(roomType) {
    switch (roomType) {
      case ROOM_TYPES.DYAD: return 2;
      case ROOM_TYPES.TRIAD: return 3;
      case ROOM_TYPES.QUAD: return 4;
      case ROOM_TYPES.KIVA: return 6;
      case ROOM_TYPES.MAIN: return 50;
      default: return 2;
    }
  }

  // Get main room URL for host community view
  getMainRoomUrl(sessionId) {
    // Deterministic community room name for this session
    return `https://${DAILY_DOMAIN}/${sessionId}-community-main`;
  }

  // Build a room URL from a Daily room name using configured domain
  getRoomUrlFromName(roomName) {
    if (!roomName) return null;
    return `https://${DAILY_DOMAIN}/${roomName}`;
  }

  // Get system capacity and usage stats
  getSystemStats() {
    const stats = {
      totalRooms: 0,
      availableRooms: 0,
      usedRooms: 0,
      totalCapacity: 0,
      currentUsage: 0,
      byType: {}
    };

    Object.entries(ROOM_POOL).forEach(([type, rooms]) => {
      const typeStats = {
        total: rooms.length,
        available: 0,
        used: 0,
        capacity: 0
      };

      rooms.forEach(room => {
        const usage = this.roomUsage.get(room.id);
        typeStats.capacity += room.maxParticipants;
        
        if (usage && usage.status === 'available') {
          typeStats.available++;
        } else {
          typeStats.used++;
        }
      });

      stats.byType[type] = typeStats;
      stats.totalRooms += typeStats.total;
      stats.availableRooms += typeStats.available;
      stats.usedRooms += typeStats.used;
      stats.totalCapacity += typeStats.capacity;
    });

    return stats;
  }

  // API-based room assignment using Daily.co API
  async assignRoomsViaAPI(sessionId, participants, roomConfiguration) {
    if (DEBUG_ROOMS) {
      console.log('🎥 Creating rooms via Daily.co API:', {
        sessionId,
        participantCount: participants.length,
        roomType: roomConfiguration.roomType,
        domain: DAILY_DOMAIN
      });
    }

    const assignments = {
      sessionId,
      rooms: {},
      participants: {},
      createdAt: new Date().toISOString()
    };

    try {
      // CRITICAL: Create main Community View room for EVERYONE (including host)
      const mainRoomName = `${sessionId}-community-main`;
      const mainRoom = await this.createDailyRoom(mainRoomName, 'community');
      
      // Store main room
      assignments.rooms['main'] = {
        ...mainRoom,
        participants: participants.map(p => p.id), // ALL participants including host
        sessionId,
        assignedAt: new Date().toISOString()
      };
      
      // EVERYONE gets assigned to main room initially
      participants.forEach(participant => {
        assignments.participants[participant.id] = {
          participantId: participant.id,
          participantName: participant.name,
          roomId: 'main',
          roomName: mainRoom.name,
          roomUrl: mainRoom.url,
          roomType: 'community',
          assignedAt: new Date().toISOString()
        };
      });
      
      if (DEBUG_ROOMS) {
        console.log(`✅ Created main community room for ${participants.length} participants (including host)`);
      }

      // Prepare breakout rooms but DO NOT assign participants yet.
      // Everyone stays in the main room until the host triggers breakouts.
      const nonHostParticipants = participants.filter(p => !p.isHost);
      const roomSize = this.getRoomSize(roomConfiguration.roomType);
      const roomsNeeded = Math.ceil(nonHostParticipants.length / roomSize);
      if (DEBUG_ROOMS) {
        console.log(`🏠 Preparing ${roomsNeeded} ${roomConfiguration.roomType} rooms for ${nonHostParticipants.length} non-hosts (no assignment yet)`);
      }
      for (let i = 0; i < roomsNeeded; i++) {
        const roomName = `${sessionId}-${roomConfiguration.roomType}-${i + 1}-${timestamp}`;
        const room = await this.createDailyRoom(roomName, roomConfiguration.roomType);
        assignments.rooms[room.id] = {
          ...room,
          participants: [],
          sessionId,
          assignedAt: new Date().toISOString()
        };
      }

      // Store assignments for session management
      this.activeRooms.set(sessionId, assignments);
      
      if (DEBUG_ROOMS) {
        console.log('✅ API room assignment complete:', {
          totalRooms: Object.keys(assignments.rooms).length,
          participantAssignments: Object.keys(assignments.participants).length
        });
      }

      return assignments;

    } catch (error) {
      console.error('❌ Daily.co API room creation failed:', error);
      throw new Error(`API room creation failed: ${error.message}`);
    }
  }

  // Create a single room via Daily.co API
  async createDailyRoom(roomName, roomType) {
    const maxParticipants = roomType === 'community' ? 50 : this.getRoomSize(roomType) + 2;
    
    const roomConfig = {
      name: roomName,
      properties: {
        max_participants: maxParticipants,
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hour expiry
      }
    };

    if (DEBUG_ROOMS) {
      console.log(`🎥 Creating Daily.co room: ${roomName}`, roomConfig);
    }

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify(roomConfig)
    });

    if (!response.ok) {
      // If room already exists (409), return deterministic room metadata
      if (response.status === 409) {
        const url = this.getRoomUrlFromName(roomName);
        return {
          id: roomName,
          name: roomName,
          url,
          type: roomType,
          maxParticipants: roomType === 'community' ? 50 : this.getRoomSize(roomType) + 2,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24*60*60*1000).toISOString()
        };
      }
      const error = await response.text();
      throw new Error(`Daily.co API error: ${response.status} - ${error}`);
    }

    const roomData = await response.json();
    
    const room = {
      id: roomData.name,
      name: roomData.name,
      url: roomData.url,
      type: roomType,
      maxParticipants: roomConfig.properties.max_participants,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(roomConfig.properties.exp * 1000).toISOString()
    };

    if (DEBUG_ROOMS) {
      console.log(`✅ Created Daily.co room: ${room.name} → ${room.url}`);
    }

    return room;
  }
}

// Export singleton instance
export const roomManager = new RoomManager();
export default RoomManager;

