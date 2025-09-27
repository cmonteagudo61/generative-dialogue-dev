// Room Manager Service - Abstraction layer for room management
// Supports both manual room pools and API-based room creation
// Easy migration path from manual to API

import { ROOM_POOL, ROOM_TYPES, USE_API_ROOMS } from '../config/roomConfig';

// Daily.co / deployment configuration
const DAILY_DOMAIN = process.env.REACT_APP_DAILY_DOMAIN || 'generativedialogue.daily.co';
// Enable API mode when requested at build time
const USE_DAILY_API = process.env.REACT_APP_USE_DAILY_API === 'true';
const DEBUG_ROOMS = process.env.REACT_APP_DEBUG_ROOMS === 'true' || true; // verbose by default for diagnosis

class RoomManager {
  constructor() {
    this.activeRooms = new Map(); // sessionId -> room assignments
    this.roomUsage = new Map();   // roomId -> usage info
    this.initializeRoomUsage();
  }

  initializeRoomUsage() {
    Object.values(ROOM_POOL).flat().forEach(room => {
      this.roomUsage.set(room.id, {
        participants: [],
        sessionId: null,
        assignedAt: null,
        status: 'available',
      });
    });
  }

  // Main entry: assign rooms for a session
  async assignRoomsForSession(sessionId, participants, roomConfiguration) {
    console.log(`🏠 Assigning rooms for session ${sessionId}:`, {
      participantCount: participants.length,
      configuration: roomConfiguration,
      usingAPI: USE_DAILY_API,
    });

    if (USE_DAILY_API) {
      return await this.assignRoomsViaAPI(sessionId, participants, roomConfiguration);
    } else {
      console.log('🏠 Using manual room pool (API disabled)');
      return await this.assignRoomsFromPool(sessionId, participants, roomConfiguration);
    }
  }

  // Manual room pool assignment (backup/MVP)
  async assignRoomsFromPool(sessionId, participants, roomConfiguration) {
    const assignments = {
      sessionId,
      rooms: {},
      participants: {},
      createdAt: new Date().toISOString(),
    };

    // Main room always exists in manual mode
    const mainRoom = this.getAvailableRoom(ROOM_TYPES.MAIN);
    if (mainRoom) {
      assignments.rooms['main'] = {
        ...mainRoom,
        participants: [],
        sessionId,
        assignedAt: new Date().toISOString(),
      };
      this.markRoomAsUsed(mainRoom.id, sessionId);
    }

    // Breakout distribution (host remains in main)
    const breakoutAssignments = this.createBreakoutAssignments(
      participants,
      roomConfiguration.roomType,
      sessionId
    );

    Object.assign(assignments.rooms, breakoutAssignments.rooms);
    Object.assign(assignments.participants, breakoutAssignments.participants);

    this.activeRooms.set(sessionId, assignments);

    console.log(`✅ Room assignment complete for session ${sessionId}:`, {
      totalRooms: Object.keys(assignments.rooms).length,
      participantAssignments: Object.keys(assignments.participants).length,
    });

    return assignments;
  }

  // Create breakout assignments (manual path)
  createBreakoutAssignments(participants, roomType, sessionId) {
    const assignments = { rooms: {}, participants: {} };

    const hostParticipant = participants.find(p => p.isHost);
    const nonHostParticipants = participants.filter(p => !p.isHost);

    if (hostParticipant) {
      console.log('🏠 Host will remain in community view (main room):', hostParticipant.name);
    }
    if (nonHostParticipants.length === 0) {
      console.log('⚠️ No non-host participants for breakout rooms');
      return assignments;
    }

    const roomSize = this.getRoomSize(roomType);
    const availableRooms = this.getAvailableRoomsByType(roomType);

    // Maximize occupancy: only fully-filled rooms; leftovers remain in main
    const roomsNeeded = Math.floor(nonHostParticipants.length / roomSize);

    if (availableRooms.length < roomsNeeded) {
      throw new Error(`Not enough ${roomType} rooms available. Need ${roomsNeeded}, have ${availableRooms.length}`);
    }

    const shuffled = [...nonHostParticipants].sort(() => Math.random() - 0.5);

    for (let i = 0; i < roomsNeeded; i++) {
      const room = availableRooms[i];
      const start = i * roomSize;
      const end = start + roomSize;
      const group = shuffled.slice(start, end);

      assignments.rooms[room.id] = {
        ...room,
        participants: group.map(p => p.id),
        sessionId,
        assignedAt: new Date().toISOString(),
      };
      this.markRoomAsUsed(room.id, sessionId);

      group.forEach(p => {
        assignments.participants[p.id] = {
          participantId: p.id,
          roomId: room.id,
          roomUrl: room.url,
          roomName: room.name,
          assignedAt: new Date().toISOString(),
        };
      });
    }

    // Leftovers + host → main
    const leftovers = shuffled.slice(roomsNeeded * roomSize);
    if (leftovers.length > 0 || hostParticipant) {
      const mainId = 'main';
      if (!assignments.rooms[mainId]) {
        const mainRoom = this.getAvailableRoom(ROOM_TYPES.MAIN) || {
          id: 'main',
          name: `${sessionId}-community-main`,
          url: this.getMainRoomUrl(sessionId),
        };
        assignments.rooms[mainId] = { ...mainRoom, participants: [], sessionId, assignedAt: new Date().toISOString() };
      }
      const mainRoom = assignments.rooms[mainId];
      const toInclude = [hostParticipant, ...leftovers].filter(Boolean);

      toInclude.forEach(p => {
        if (!assignments.participants[p.id]) {
          assignments.participants[p.id] = {
            participantId: p.id,
            roomId: mainRoom.id,
            roomUrl: mainRoom.url,
            roomName: mainRoom.name,
            assignedAt: new Date().toISOString(),
          };
        }
      });
      mainRoom.participants = Array.from(new Set([...(mainRoom.participants || []), ...toInclude.map(p => p.id)]));
    }

    return assignments;
  }

  // API-based room assignment using Netlify proxy
  async assignRoomsViaAPI(sessionId, participants, roomConfiguration) {
    if (DEBUG_ROOMS) {
      console.log('🚨 assignRoomsViaAPI CALLED:', {
        sessionId,
        participantCount: participants.length,
        roomType: roomConfiguration.roomType,
        domain: DAILY_DOMAIN,
        useApi: USE_DAILY_API,
      });
    }

    const assignments = {
      sessionId,
      rooms: {},
      participants: {},
      createdAt: new Date().toISOString(),
    };

    try {
      // Deterministic-but-unique suffix to avoid collisions
      const ts = Date.now().toString().slice(-6);

      // 1) Create main room for everyone
      const mainRoomName = `${sessionId}-community-main-${ts}`;
      const mainRoom = await this.createDailyRoom(mainRoomName, 'community');

      assignments.rooms['main'] = {
        ...mainRoom,
        participants: participants.map(p => p.id),
        sessionId,
        assignedAt: new Date().toISOString(),
      };

      participants.forEach(p => {
        assignments.participants[p.id] = {
          participantId: p.id,
          participantName: p.name,
          roomId: 'main',
          roomName: mainRoom.name,
          roomUrl: mainRoom.url,
          roomType: 'community',
          assignedAt: new Date().toISOString(),
        };
      });

      // 2) Create breakout rooms only if requested
      if (roomConfiguration.roomType && roomConfiguration.roomType !== 'community') {
        const nonHost = participants.filter(p => !p.isHost);
        const roomSize = this.getRoomSize(roomConfiguration.roomType);
        // Fully-filled rooms only
        const roomsNeeded = Math.floor(nonHost.length / roomSize);

        if (DEBUG_ROOMS) {
          console.log(`🏠 Need ${roomsNeeded} ${roomConfiguration.roomType} rooms for ${nonHost.length} non-host participants`);
        }

        const createdRooms = [];
        for (let i = 0; i < roomsNeeded; i++) {
          const name = `${sessionId}-${roomConfiguration.roomType}-${i + 1}-${ts}`;
          const room = await this.createDailyRoom(name, roomConfiguration.roomType);
          createdRooms.push(room);
        }

        // Randomize and assign into full groups
        const shuffled = [...nonHost].sort(() => Math.random() - 0.5);
        for (let i = 0; i < roomsNeeded; i++) {
          const room = createdRooms[i];
          const start = i * roomSize;
          const end = start + roomSize;
          const group = shuffled.slice(start, end);

          if (group.length === roomSize) {
            assignments.rooms[room.id] = {
              ...room,
              participants: group.map(p => p.id),
              sessionId,
              assignedAt: new Date().toISOString(),
            };

            group.forEach(p => {
              assignments.participants[p.id] = {
                participantId: p.id,
                participantName: p.name,
                roomId: room.id,
                roomName: room.name,
                roomUrl: room.url,
                roomType: roomConfiguration.roomType,
                assignedAt: new Date().toISOString(),
              };
            });
          }
        }
      } else if (DEBUG_ROOMS) {
        console.log('🏛️ Only creating main community room (no breakout rooms)');
      }

      this.activeRooms.set(sessionId, assignments);

      if (DEBUG_ROOMS) {
        console.log('✅ API room assignment complete:', {
          totalRooms: Object.keys(assignments.rooms).length,
          participantAssignments: Object.keys(assignments.participants).length,
        });
      }

      return assignments;
    } catch (error) {
      console.error('❌ Daily.co API room creation failed:', error);
      throw new Error(`API room creation failed: ${error.message}`);
    }
  }

  // Create a single room via Netlify Function proxy (protects API key)
  async createDailyRoom(roomName, roomType) {
    const maxParticipants = roomType === 'community' ? 50 : this.getRoomSize(roomType) + 2;

    if (DEBUG_ROOMS) {
      console.log(`🎥 CREATING Daily.co room via proxy: ${roomName}`, {
        roomType,
        maxParticipants,
      });
    }

    const response = await fetch('/.netlify/functions/daily-create-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomName, roomType, maxParticipants }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
      const errTxt = (data && (data.error || data.message)) || String(response.status);
      console.error(`❌ Daily.co proxy error: ${errTxt}`);
      throw new Error(`Daily.co proxy error: ${errTxt}`);
    }

    const real = data.room || data;

    const room = {
      id: real.name || real.id || roomName,
      name: real.name || roomName,
      url: real.url || this.getRoomUrlFromName(roomName),
      type: roomType,
      maxParticipants,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    if (DEBUG_ROOMS) {
      console.log(`✅ SUCCESSFULLY created Daily.co room: ${room.name} → ${room.url}`);
    }

    return room;
  }

  // ---- Helpers (pool + stats) ----

  getAvailableRoom(roomType) {
    const rooms = ROOM_POOL[roomType] || [];
    return rooms.find(room => {
      const usage = this.roomUsage.get(room.id);
      return usage && usage.status === 'available';
    });
  }

  getAvailableRoomsByType(roomType) {
    const rooms = ROOM_POOL[roomType] || [];
    const available = rooms.filter(room => {
      const usage = this.roomUsage.get(room.id);
      return usage && usage.status === 'available';
    });
    console.log(`🏠 Room availability check for ${roomType}:`, {
      totalRooms: rooms.length,
      availableRooms: available.length,
      roomIds: available.map(r => r.id),
    });
    return available;
  }

  markRoomAsUsed(roomId, sessionId) {
    const usage = this.roomUsage.get(roomId);
    if (usage) {
      usage.status = 'in-use';
      usage.sessionId = sessionId;
      usage.assignedAt = new Date().toISOString();
    }
  }

  releaseRoom(roomId) {
    const usage = this.roomUsage.get(roomId);
    if (usage) {
      usage.status = 'available';
      usage.sessionId = null;
      usage.participants = [];
      usage.assignedAt = null;
    }
  }

  releaseSessionRooms(sessionId) {
    const assignments = this.activeRooms.get(sessionId);
    if (assignments) {
      const roomIds = Object.keys(assignments.rooms);
      console.log(`🏠 Releasing ${roomIds.length} rooms for session ${sessionId}:`, roomIds);
      roomIds.forEach(roomId => this.releaseRoom(roomId));
      this.activeRooms.delete(sessionId);
      console.log(`🏠 All rooms released for session ${sessionId}`);
    } else {
      console.log(`🏠 No rooms to release for session ${sessionId} (no active assignments)`);
    }
  }

  getSessionRooms(sessionId) {
    return this.activeRooms.get(sessionId);
  }

  getParticipantRoom(sessionId, participantId) {
    const assignments = this.activeRooms.get(sessionId);
    if (assignments && assignments.participants[participantId]) {
      return assignments.participants[participantId];
    }
    return null;
  }

  async reassignParticipant(sessionId, participantId, newRoomType) {
    const assignments = this.activeRooms.get(sessionId);
    if (!assignments) throw new Error(`Session ${sessionId} not found`);

    const newRoom = this.getAvailableRoom(newRoomType);
    if (!newRoom) throw new Error(`No available ${newRoomType} rooms`);

    assignments.participants[participantId] = {
      participantId,
      roomId: newRoom.id,
      roomUrl: newRoom.url,
      roomName: newRoom.name,
      assignedAt: new Date().toISOString(),
    };

    return assignments.participants[participantId];
  }

  getRoomSize(roomType) {
    const rt = typeof roomType === 'string' ? roomType.toLowerCase() : roomType;
    switch (rt) {
      case ROOM_TYPES.DYAD:
      case 'dyad':
        return 2;
      case ROOM_TYPES.TRIAD:
      case 'triad':
        return 3;
      case ROOM_TYPES.QUAD:
      case 'quad':
        return 4;
      case ROOM_TYPES.KIVA:
      case 'kiva':
        return 6;
      case ROOM_TYPES.MAIN:
      case 'main':
        return 50;
      case 'fishbowl':
        return 6;
      case 'self':
      case 'individual':
        return 1;
      default:
        return 2;
    }
  }

  getMainRoomUrl(sessionId) {
    return `https://${DAILY_DOMAIN}/${sessionId}-community-main`;
  }

  getRoomUrlFromName(roomName) {
    if (!roomName) return null;
    return `https://${DAILY_DOMAIN}/${roomName}`;
  }

  getSystemStats() {
    const stats = {
      totalRooms: 0,
      availableRooms: 0,
      usedRooms: 0,
      totalCapacity: 0,
      currentUsage: 0,
      byType: {},
    };

    Object.entries(ROOM_POOL).forEach(([type, rooms]) => {
      const typeStats = { total: rooms.length, available: 0, used: 0, capacity: 0 };
      rooms.forEach(room => {
        const usage = this.roomUsage.get(room.id);
        typeStats.capacity += room.maxParticipants;
        if (usage && usage.status === 'available') typeStats.available++;
        else typeStats.used++;
      });
      stats.byType[type] = typeStats;
      stats.totalRooms += typeStats.total;
      stats.availableRooms += typeStats.available;
      stats.usedRooms += typeStats.used;
      stats.totalCapacity += typeStats.capacity;
    });

    return stats;
  }
}

// Export singleton instance
export const roomManager = new RoomManager();
export default RoomManager;
