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

    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`
      },
      body: JSON.stringify({
        name: `session-${sessionCode.toLowerCase()}`,
        privacy: 'public',
        properties: {
          max_participants: participantCount || 6,
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

