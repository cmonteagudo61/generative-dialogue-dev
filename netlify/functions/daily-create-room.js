/**
 * Netlify Function: Daily.co Room Creation
 * URL: /.netlify/functions/daily-create-room
 */

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { sessionCode, hostName, participantCount } = JSON.parse(event.body);
    
    if (!sessionCode) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Session code is required' })
      };
    }
    
    console.log(`🎥 Creating Daily.co room: ${sessionCode}`);
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      console.warn('⚠️ DAILY_API_KEY not found, creating mock room');
      const mockRoom = {
        url: `https://generative-dialogue.daily.co/${sessionCode.toLowerCase()}`,
        name: `session-${sessionCode.toLowerCase()}`,
        id: `mock-${sessionCode}`,
        created_at: new Date().toISOString(),
        config: { max_participants: participantCount || 6 }
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, room: mockRoom })
      };
    }

    // Sanitize name to avoid Daily invalid-request (lowercase, safe chars, short)
    const raw = String(sessionCode || 'demo');
    const safeName = `session-${raw.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 48)}`;

    const payload = {
      name: safeName,
      privacy: 'public',
      properties: {
        max_participants: Number(participantCount) || 6,
        exp: Math.floor(Date.now() / 1000) + (90 * 60)
      }
    };

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let roomData = {};
    try { roomData = JSON.parse(text); } catch (_) {}
    if (!response.ok) {
      const errMsg = roomData?.error || text || `status ${response.status}`;
      throw new Error(`Daily.co API error: ${errMsg}`);
    }

    console.log(`✅ Daily.co room created: ${roomData.url}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, room: roomData })
    };
    
  } catch (error) {
    console.error('❌ Daily.co room creation error:', error?.message || error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error?.message || 'unknown-error', 
        success: false 
      })
    };
  }
};

