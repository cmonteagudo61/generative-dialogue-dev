// Room Configuration - Enhanced Manual System with API Migration Path
// This file defines the room pool and can easily be swapped for API-based room creation

// Single source of truth for Daily domain
const DAILY_DOMAIN = process.env.REACT_APP_DAILY_DOMAIN || 'generativedialogue.daily.co';

export const ROOM_TYPES = {
  MAIN: 'main',
  DYAD: 'dyad', 
  TRIAD: 'triad',
  QUAD: 'quad',
  KIVA: 'kiva'
};

// Room Pool Configuration
// TODO: Create these rooms manually on Daily.co for MVP
// Later: Replace with API-generated rooms
export const ROOM_POOL = {
  // Main/Community Rooms
  main: [
    {
      id: 'main-1',
      name: 'Main Room',
      url: `https://${DAILY_DOMAIN}/MainRoom`,
      type: ROOM_TYPES.MAIN,
      maxParticipants: 50,
      status: 'available'
    }
  ],
  
  // Dyad Rooms (2 people each) - Expanded for 6+ participants
  dyad: [
    {
      id: 'dyad-1',
      name: 'Dyad 1',
      url: `https://${DAILY_DOMAIN}/Dyad1`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-2', 
      name: 'Dyad 2',
      url: `https://${DAILY_DOMAIN}/Dyad2`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-3',
      name: 'Dyad 3', 
      url: `https://${DAILY_DOMAIN}/Dyad3`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-4',
      name: 'Dyad 4',
      url: `https://${DAILY_DOMAIN}/Dyad4`, 
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-5',
      name: 'Dyad 5',
      url: `https://${DAILY_DOMAIN}/Dyad5`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-6',
      name: 'Dyad 6',
      url: `https://${DAILY_DOMAIN}/Dyad6`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-7',
      name: 'Dyad 7',
      url: `https://${DAILY_DOMAIN}/Dyad7`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-8',
      name: 'Dyad 8',
      url: `https://${DAILY_DOMAIN}/Dyad8`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-9',
      name: 'Dyad 9',
      url: `https://${DAILY_DOMAIN}/Dyad9`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-10',
      name: 'Dyad 10',
      url: `https://${DAILY_DOMAIN}/Dyad10`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-11',
      name: 'Dyad 11',
      url: `https://${DAILY_DOMAIN}/Dyad11`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-12',
      name: 'Dyad 12',
      url: `https://${DAILY_DOMAIN}/Dyad12`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-13',
      name: 'Dyad 13',
      url: `https://${DAILY_DOMAIN}/Dyad13`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-14',
      name: 'Dyad 14',
      url: `https://${DAILY_DOMAIN}/Dyad14`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    },
    {
      id: 'dyad-15',
      name: 'Dyad 15',
      url: `https://${DAILY_DOMAIN}/Dyad15`,
      type: ROOM_TYPES.DYAD,
      maxParticipants: 2,
      status: 'available'
    }
  ],
  
  // Triad Rooms (3 people each)
  triad: [
    {
      id: 'triad-1',
      name: 'Triad 1',
      url: `https://${DAILY_DOMAIN}/Triad1`,
      type: ROOM_TYPES.TRIAD,
      maxParticipants: 3,
      status: 'available'
    },
    {
      id: 'triad-2',
      name: 'Triad 2', 
      url: `https://${DAILY_DOMAIN}/Triad2`,
      type: ROOM_TYPES.TRIAD,
      maxParticipants: 3,
      status: 'available'
    },
    {
      id: 'triad-3',
      name: 'Triad 3',
      url: `https://${DAILY_DOMAIN}/Triad3`,
      type: ROOM_TYPES.TRIAD,
      maxParticipants: 3,
      status: 'available'
    },
    {
      id: 'triad-4',
      name: 'Triad 4',
      url: `https://${DAILY_DOMAIN}/Triad4`,
      type: ROOM_TYPES.TRIAD,
      maxParticipants: 3,
      status: 'available'
    }
  ],
  
  // Quad Rooms (4 people each)
  quad: [
    {
      id: 'quad-1',
      name: 'Quad 1',
      url: `https://${DAILY_DOMAIN}/Quad1`,
      type: ROOM_TYPES.QUAD,
      maxParticipants: 4,
      status: 'available'
    },
    {
      id: 'quad-2',
      name: 'Quad 2',
      url: `https://${DAILY_DOMAIN}/Quad2`,
      type: ROOM_TYPES.QUAD,
      maxParticipants: 4,
      status: 'available'
    },
    {
      id: 'quad-3',
      name: 'Quad 3',
      url: `https://${DAILY_DOMAIN}/Quad3`,
      type: ROOM_TYPES.QUAD,
      maxParticipants: 4,
      status: 'available'
    }
  ],
  
  // Kiva Rooms (6 people each - fishbowl style)
  kiva: [
    {
      id: 'kiva-1',
      name: 'Kiva 1',
      url: `https://${DAILY_DOMAIN}/Kiva1`,
      type: ROOM_TYPES.KIVA,
      maxParticipants: 6,
      status: 'available'
    },
    {
      id: 'kiva-2',
      name: 'Kiva 2',
      url: `https://${DAILY_DOMAIN}/Kiva2`,
      type: ROOM_TYPES.KIVA,
      maxParticipants: 6,
      status: 'available'
    }
  ]
};

// Room Pool Statistics
export const getRoomPoolStats = () => {
  const stats = {};
  Object.keys(ROOM_POOL).forEach(type => {
    stats[type] = {
      total: ROOM_POOL[type].length,
      available: ROOM_POOL[type].filter(room => room.status === 'available').length,
      maxCapacity: ROOM_POOL[type].reduce((sum, room) => sum + room.maxParticipants, 0)
    };
  });
  return stats;
};

// Calculate total system capacity
export const getTotalCapacity = () => {
  let total = 0;
  Object.values(ROOM_POOL).forEach(rooms => {
    rooms.forEach(room => {
      total += room.maxParticipants;
    });
  });
  return total;
};

// Migration flag - when true, use API instead of manual pool
export const USE_API_ROOMS = process.env.REACT_APP_USE_DAILY_API === 'true';

console.log('🏠 Room Pool Initialized:', {
  totalRooms: Object.values(ROOM_POOL).flat().length,
  totalCapacity: getTotalCapacity(),
  useAPI: USE_API_ROOMS
});

