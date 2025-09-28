
// Netlify Function: Server-authoritative session orchestration (CORS-free)
// Endpoints (same-origin):
//  - POST /.netlify/functions/session-orchestrator/start-main
//  - POST /.netlify/functions/session-orchestrator/create-breakouts
//  - POST /.netlify/functions/session-orchestrator/end-breakouts

const store = Object.create(null); // { [sessionId]: { version, status, currentPhase, participants, hostName, rooms, assignments } }

function getState(sessionId) {
  if (!store[sessionId]) {
    store[sessionId] = {
      version: 0,
      status: 'waiting',
      currentPhase: 'waiting',
      participants: [],
      hostName: 'Host',
      rooms: {},
      assignments: {}
    };
  }
  return store[sessionId];
}

function roomSize(type) {
  switch (type) {
    case 'dyad': return 2;
    case 'triad': return 3;
    case 'quad': return 4;
    case 'kiva': return 6;
    default: return 2;
  }
}

async function createDailyRoom(roomName, roomType, maxParticipants) {
  // Proxy to our existing Daily function to keep API key server-side
  const res = await fetch(`${process.env.URL || ''}/.netlify/functions/daily-create-room`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomName, roomType, maxParticipants })
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.success === false) {
    const err = j?.error || String(res.status);
    throw new Error(`Daily proxy error: ${err}`);
  }
  const real = j.room || j;
  return {
    id: real.name || real.id || roomName,
    name: real.name || roomName,
    url: real.url,
    type: roomType,
    maxParticipants: maxParticipants || roomSize(roomType) + 2
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const path = event.path || '';
    const body = event.body ? JSON.parse(event.body) : {};
    const sessionId = body.sessionId || body.session || body.sid || 'OPUS-40';
    const state = getState(sessionId);

    if (path.endsWith('/start-main')) {
      const participants = Array.isArray(body.participants) ? body.participants : state.participants;
      const hostName = body.hostName || state.hostName;
      const ts = String(Date.now()).slice(-6);
      const mainName = `${slug}-community-main`;
      const main = await createDailyRoom(mainName, 'community', 50);
      state.participants = participants;
      state.hostName = hostName;
      state.rooms = { main: { ...main, participants: participants.map(p => p.id) } };
      state.assignments = {};
      participants.forEach(p => {
        state.assignments[p.id] = {
          participantId: p.id,
          participantName: p.name,
          roomId: 'main', roomName: main.name, roomUrl: main.url, roomType: 'community',
          assignedAt: new Date().toISOString()
        };
      });
      state.status = 'main-room-active';
      state.currentPhase = 'main-room';
      state.version += 1;
      return { statusCode: 200, body: JSON.stringify({ ok: true, version: state.version, sessionData: state }) };
    }

    if (path.endsWith('/create-breakouts')) {
      const roomType = body.roomType || 'dyad';
      const participants = Array.isArray(body.participants) && body.participants.length ? body.participants : state.participants;
      if (!participants || !participants.length) return { statusCode: 400, body: JSON.stringify({ error: 'participants required' }) };
      const size = roomSize(roomType);
      const host = participants.find(p => p.isHost) || null;
      const nonHost = participants.filter(p => !p.isHost);
      const roomsNeeded = Math.floor(nonHost.length / size);
      const ts = String(Date.now()).slice(-6);

      // Always fresh main to avoid expired rooms
      const main = await createDailyRoom(`${slug}-community-main`, 'community', 50);
      const rooms = { main: { ...main, participants: [] } };
      const assignments = {};

      const roomIds = [];
      for (let i = 0; i < roomsNeeded; i++) {
        const r = await createDailyRoom(`${slug}-${roomType}-${i+1}-${ts}`, roomType, size + 2);
        rooms[r.id] = { ...r, participants: [] };
        roomIds.push(r.id);
      }
      nonHost.forEach((p, idx) => {
        const gi = Math.floor(idx / size);
        if (gi < roomIds.length) {
          const rk = roomIds[gi];
          rooms[rk].participants.push(p.id);
          assignments[p.id] = { participantId: p.id, participantName: p.name, roomId: rk, roomName: rooms[rk].name, roomUrl: rooms[rk].url, roomType, assignedAt: new Date().toISOString() };
        } else {
          rooms.main.participants.push(p.id);
          assignments[p.id] = { participantId: p.id, participantName: p.name, roomId: 'main', roomName: rooms.main.name, roomUrl: rooms.main.url, roomType: 'community', assignedAt: new Date().toISOString() };
        }
      });
      if (host) {
        rooms.main.participants.unshift(host.id);
        assignments[host.id] = { participantId: host.id, participantName: host.name, roomId: 'main', roomName: rooms.main.name, roomUrl: rooms.main.url, roomType: 'community', assignedAt: new Date().toISOString() };
      }
      state.rooms = rooms;
      state.assignments = assignments;
      state.status = 'rooms-assigned';
      state.currentPhase = 'breakout-rooms';
      state.participants = participants;
      state.version += 1;
      return { statusCode: 200, body: JSON.stringify({ ok: true, version: state.version, sessionData: state }) };
    }

    if (path.endsWith('/end-breakouts')) {
      const participants = state.participants || [];
      const ts = String(Date.now()).slice(-6);
      const main = await createDailyRoom(`${slug}-community-main`, 'community', 50);
      const rooms = { main: { ...main, participants: participants.map(p => p.id) } };
      const assignments = {};
      participants.forEach(p => {
        assignments[p.id] = { participantId: p.id, participantName: p.name, roomId: 'main', roomName: main.name, roomUrl: main.url, roomType: 'community', assignedAt: new Date().toISOString() };
      });
      state.rooms = rooms;
      state.assignments = assignments;
      state.status = 'main-room-active';
      state.currentPhase = 'main-room';
      state.version += 1;
      return { statusCode: 200, body: JSON.stringify({ ok: true, version: state.version, sessionData: state }) };
    }

    return { statusCode: 404, body: 'Not Found' };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};


