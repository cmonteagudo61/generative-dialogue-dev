// Netlify Function: Create a Daily.co room using server-side secret
// Expects JSON body: { name: string, type?: string, properties?: object }
// Returns: { id, name, url, type, maxParticipants, createdAt, expiresAt }

const DAILY_API_URL = 'https://api.daily.co/v1/rooms';

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Missing DAILY_API_KEY' }) };
    }

    const input = JSON.parse(event.body || '{}');
    const name = String(input.name || '').trim();
    const roomType = String(input.type || input.roomType || 'community').toLowerCase();
    const domain = process.env.DAILY_DOMAIN || 'generativedialogue.daily.co';

    if (!name) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing room name' }) };
    }

    const maxParticipants = roomType === 'community' ? 50 : (roomType === 'kiva' ? 8 : 6);
    const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60; // 24h expiry

    const body = {
      name,
      properties: {
        max_participants: maxParticipants,
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
        exp,
      },
    };

    const resp = await fetch(DAILY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      // If room already exists (409), synthesize a response
      if (resp.status === 409) {
        const url = `https://${domain}/${name}`;
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: name,
            name,
            url,
            type: roomType,
            maxParticipants,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(exp * 1000).toISOString(),
          }),
        };
      }
      const text = await resp.text();
      return { statusCode: resp.status, body: JSON.stringify({ error: text }) };
    }

    const data = await resp.json();
    return {
      statusCode: 200,
      body: JSON.stringify({
        id: data.name,
        name: data.name,
        url: data.url || `https://${domain}/${data.name}`,
        type: roomType,
        maxParticipants,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(exp * 1000).toISOString(),
      }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error', message: String(err && err.message || err) }) };
  }
};


