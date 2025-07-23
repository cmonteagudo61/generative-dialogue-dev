const WebSocket = require('ws');

const API_KEY = 'ccfec76e1dbfb07d755019dd3ff5154026041ce4';

console.log('🚀 Testing direct Deepgram connection...');

// Minimal Deepgram WebSocket URL
const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en&encoding=linear16&sample_rate=16000`;

const ws = new WebSocket(deepgramUrl, {
  headers: {
    'Authorization': `Token ${API_KEY}`
  }
});

ws.on('open', () => {
  console.log('✅ Connected to Deepgram directly!');
  
  // Send keepalive
  setInterval(() => {
    ws.send(JSON.stringify({ type: 'KeepAlive' }));
  }, 5000);
  
  console.log('🎤 Deepgram connection successful - API key is working!');
  
  setTimeout(() => {
    ws.close();
    process.exit(0);
  }, 3000);
});

ws.on('message', (data) => {
  console.log('📡 Deepgram response:', data.toString());
});

ws.on('error', (error) => {
  console.error('❌ Deepgram error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Deepgram closed: code=${code}, reason=${reason}`);
  process.exit(0);
}); 