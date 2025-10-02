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
    const { sessionCode, hostName, participantCount, roomType, maxParticipants } = JSON.parse(event.body);
    
    // sessionCode is optional; when missing, we auto-generate a unique room name below
    
    console.log(`🎥 Creating Daily.co room: ${sessionCode || '(auto)'}`);
    const DAILY_API_KEY = process.env.DAILY_API_KEY;
    
    if (!DAILY_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'DAILY_API_KEY is not configured on Netlify' })
      };
    }

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: (sessionCode ? `session-${String(sessionCode).toLowerCase()}` : `room-${Date.now().toString(36)}`),
        privacy: 'public',
        properties: {
          max_participants: maxParticipants || participantCount || 6,
          enable_chat: true,
          enable_screenshare: true,
          exp: Math.floor(Date.now() / 1000) + (90 * 60) // 90 minutes from now
        }
      })
    });

    const roomData = await response.json();
    
    if (!response.ok) {
      throw new Error(`Daily.co API error: ${roomData.error}`);
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

