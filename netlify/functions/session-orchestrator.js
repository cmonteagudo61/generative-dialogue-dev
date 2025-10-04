/* Server-authoritative session orchestrator: normalize-dyads */

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }
    const body = event.body ? JSON.parse(event.body) : {};
    const action = body.action;
    const sessionId = body.sessionId || body.session || 'SESSION';
    const participants = Array.isArray(body.participants) ? body.participants : [];

    if (action !== 'normalize-dyads') {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Unsupported action' }) };
    }

    const origin = (event.headers && ((event.headers['x-forwarded-proto'] && event.headers['host'])
      ? (event.headers['x-forwarded-proto'] + '://' + event.headers['host'])
      : null)) || process.env.URL || process.env.DEPLOY_URL || '';

    async function createDailyRoom(roomType, maxParticipants) {
      const res = await fetch(`${origin}/.netlify/functions/daily-create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomType, maxParticipants, sessionCode: `${sessionId}-${roomType}-${Date.now().toString(36)}` })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j.success === false) {
        throw new Error(j?.error || `Daily proxy error: ${res.status}`);
      }
      const real = j.room || j;
      return {
        id: real.name || real.id,
        name: real.name,
        url: real.url,
        type: roomType,
        maxParticipants: maxParticipants || 8
      };
    }

    const seen = new Set();
    const stableParticipants = (participants || []).filter(p => p && p.id && !seen.has(p.id) && seen.add(p.id))
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    const host = stableParticipants.find(p => p.isHost) || stableParticipants[0] || null;
    const nonHost = stableParticipants.filter(p => !p.isHost);

    const main = await createDailyRoom('community', 16);

    const pairs = [];
    for (let i = 0; i + 1 < nonHost.length; i += 2) pairs.push([nonHost[i], nonHost[i + 1]]);

    const rooms = { main: { id: 'main', name: main.name, url: main.url, type: 'community', participants: [] } };
    const assignments = {};

    for (let i = 0; i < pairs.length; i++) {
      const [a, b] = pairs[i];
      const r = await createDailyRoom('dyad', 4);
      const id = `dyad-${i + 1}`;
      rooms[id] = { id, name: r.name, url: r.url, type: 'dyad', participants: [a.id, b.id] };
      [a, b].forEach(p => {
        assignments[p.id] = {
          participantId: p.id,
          participantName: p.name,
          roomId: id,
          roomName: r.name,
          roomUrl: r.url,
          roomType: 'dyad',
          assignedAt: new Date().toISOString()
        };
      });
    }

    const used = new Set(pairs.flat().map(p => p.id));
    const leftovers = [host, ...nonHost.filter(p => !used.has(p.id))].filter(Boolean);
    leftovers.forEach(p => {
      rooms.main.participants.push(p.id);
      assignments[p.id] = {
        participantId: p.id,
        participantName: p.name,
        roomId: 'main',
        roomName: main.name,
        roomUrl: main.url,
        roomType: 'community',
        assignedAt: new Date().toISOString()
      };
    });

    const sessionData = {
      sessionId,
      participants: stableParticipants,
      roomAssignments: { rooms, participants: assignments },
      status: 'rooms-assigned',
      currentPhase: 'breakout-rooms',
      version: Date.now()
    };

    return { statusCode: 200, body: JSON.stringify({ ok: true, sessionData }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: e.message }) };
  }
};





