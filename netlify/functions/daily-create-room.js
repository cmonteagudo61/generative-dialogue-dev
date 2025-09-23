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
    const { sessionCode, hostName, participantCount, roomName, roomType, maxParticipants } = JSON.parse(event.body);
    
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      console.warn('⚠️ DAILY_API_KEY not found, creating mock room');
      const name = roomName || (sessionCode ? `session-${String(sessionCode).toLowerCase()}` : `session-${Date.now()}`);
      const mockRoom = {
        url: `https://generative-dialogue.daily.co/${name}`,
        name,
        id: `mock-${name}`,
        created_at: new Date().toISOString(),
        config: { max_participants: maxParticipants || participantCount || 6, roomType: roomType || 'community' }
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, room: mockRoom })
      };
    }

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: roomName || (sessionCode ? `session-${sessionCode.toLowerCase()}` : undefined),
        privacy: 'public',
        properties: {
          max_participants: maxParticipants || participantCount || 6,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24h
        }
      })
    });

    const roomData = await response.json();
    
    if (!response.ok) {
      // If name conflict (409), treat as success with existing room
      if (response.status === 409) {
        console.warn('⚠️ Room already exists, returning existing details');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true, room: roomData })
        };
      }
      throw new Error(`Daily.co API error: ${roomData.error || roomData.message || response.status}`);
    }

    console.log(`✅ Daily.co room created: ${roomData.url}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, room: roomData })
    };
    
  } catch (error) {
    console.error('❌ Daily.co room creation error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message, 
        success: false 
      })
    };
  }
};

