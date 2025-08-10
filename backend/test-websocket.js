const WebSocket = require('ws');

console.log('🔌 Testing WebSocket connection to local server...');

const ws = new WebSocket('ws://localhost:8080/ws/transcribe');

ws.on('open', () => {
  console.log('✅ Connected to server WebSocket');
  
  // Send start command
  console.log('🚀 Sending start command...');
  ws.send(JSON.stringify({ type: 'start' }));
  
  // Wait a bit and then close
  setTimeout(() => {
    console.log('🛑 Closing connection...');
    ws.close();
  }, 5000);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 Received message:', message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed (code: ${code}, reason: ${reason})`);
  process.exit(0);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
}); 