const express = require('express');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8080;
const API_KEY = 'ccfec76e1dbfb07d755019dd3ff5154026041ce4';

// Create HTTP server
const server = require('http').createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

console.log('🚀 Starting clean Deepgram server...');

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    deepgram: 'configured'
  });
});

// WebSocket handler
wss.on('connection', (clientWs) => {
  console.log('👤 Client connected');
  let deepgramWs = null;

  clientWs.on('message', async (message) => {
    try {
      // Handle text messages (commands)
      if (typeof message === 'string' || message instanceof Buffer) {
        let data;
        try {
          data = JSON.parse(message.toString());
        } catch (e) {
          // It's binary audio data
          if (deepgramWs && deepgramWs.readyState === WebSocket.OPEN) {
            deepgramWs.send(message);
          }
          return;
        }

        // Handle start command
        if (data.type === 'start') {
          console.log('🚀 Starting Deepgram connection...');
          
          const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&encoding=linear16&sample_rate=16000&channels=1&diarize=true&utterances=true&interim_results=true`;
          
          deepgramWs = new WebSocket(deepgramUrl, {
            headers: {
              'Authorization': `Token ${API_KEY}`
            }
          });

          deepgramWs.on('open', () => {
            console.log('✅ Deepgram connected successfully');
            clientWs.send(JSON.stringify({ 
              type: 'status', 
              message: 'Connected to Deepgram',
              connected: true 
            }));
          });

          deepgramWs.on('message', (deepgramData) => {
            try {
              const response = JSON.parse(deepgramData.toString());
              
              if (response.channel?.alternatives?.[0]?.transcript) {
                const transcript = response.channel.alternatives[0].transcript;
                const confidence = response.channel.alternatives[0].confidence || 0;
                const isFinal = response.is_final || false;

                if (transcript.trim()) {
                  console.log(`📝 Transcript: "${transcript}"`);
                  clientWs.send(JSON.stringify({
                    type: 'transcript',
                    transcript: transcript,
                    confidence: confidence,
                    isFinal: isFinal,
                    timestamp: new Date().toISOString()
                  }));
                }
              }
            } catch (error) {
              console.error('❌ Error parsing Deepgram response:', error);
            }
          });

          deepgramWs.on('error', (error) => {
            console.error('❌ Deepgram error:', error);
            clientWs.send(JSON.stringify({ 
              type: 'error', 
              message: `Deepgram error: ${error.message}` 
            }));
          });

          deepgramWs.on('close', (code, reason) => {
            console.log(`🔌 Deepgram closed: ${code} - ${reason}`);
            clientWs.send(JSON.stringify({ 
              type: 'error', 
              message: `Deepgram disconnected (${code})` 
            }));
          });
        }

        // Handle stop command
        if (data.type === 'stop') {
          if (deepgramWs) {
            deepgramWs.close();
            deepgramWs = null;
          }
        }
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });

  clientWs.on('close', () => {
    console.log('👤 Client disconnected');
    if (deepgramWs) {
      deepgramWs.close();
    }
  });

  clientWs.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`✅ Clean server running on port ${PORT}`);
  console.log(`🔑 Deepgram API configured`);
  console.log(`🎯 Ready for testing!`);
}); 