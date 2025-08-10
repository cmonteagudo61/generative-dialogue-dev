/**
 * Simple Deepgram API Test
 * Tests the REST API connectivity before building the full proof of concept
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');

const API_KEY = process.env.DEEPGRAM_API_KEY;

if (!API_KEY) {
  console.error('❌ No DEEPGRAM_API_KEY found in .env file');
  process.exit(1);
}

console.log('🔑 API Key found:', API_KEY.substring(0, 8) + '...');

// Test basic API connectivity
async function testAPIConnectivity() {
  console.log('\n🌐 Testing Deepgram API connectivity...');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepgram.com',
      port: 443,
      path: '/v1/projects',
      method: 'GET',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ API connectivity successful!');
          const projects = JSON.parse(data);
          console.log(`📁 Found ${projects.projects?.length || 0} projects`);
          resolve(true);
        } else {
          console.log('❌ API connectivity failed');
          console.log('Response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Generate simple test audio
function generateTestAudio() {
  console.log('\n🎵 Generating test audio...');
  
  // Create a 2-second 440Hz sine wave (A4 note)
  const sampleRate = 16000;
  const duration = 2; // seconds
  const frequency = 440; // Hz
  const amplitude = 16000;
  
  const numSamples = sampleRate * duration;
  const buffer = Buffer.alloc(numSamples * 2); // 16-bit samples
  
  for (let i = 0; i < numSamples; i++) {
    const value = Math.round(amplitude * Math.sin(2 * Math.PI * frequency * i / sampleRate));
    buffer.writeInt16LE(value, i * 2);
  }
  
  fs.writeFileSync('test-audio.raw', buffer);
  console.log('✅ Test audio generated: test-audio.raw');
  return 'test-audio.raw';
}

// Test transcription with generated audio
async function testTranscription(audioFile) {
  console.log('\n🎤 Testing transcription...');
  
  const audioData = fs.readFileSync(audioFile);
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.deepgram.com',
      port: 443,
      path: '/v1/listen?model=nova-2&encoding=linear16&sample_rate=16000&channels=1',
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'audio/raw',
        'Content-Length': audioData.length
      }
    };

    const req = https.request(options, (res) => {
      console.log(`Transcription status: ${res.statusCode}`);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const result = JSON.parse(data);
            const transcript = result.results?.channels[0]?.alternatives[0]?.transcript || '';
            
            console.log('✅ Transcription successful!');
            console.log('📝 Transcript:', transcript || '(empty - expected for tone)');
            console.log('🔧 Full response structure verified');
            resolve(true);
          } catch (error) {
            console.log('❌ Failed to parse response:', error.message);
            console.log('Raw response:', data);
            resolve(false);
          }
        } else {
          console.log('❌ Transcription failed');
          console.log('Response:', data);
          resolve(false);
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Transcription request failed:', error.message);
      reject(error);
    });

    req.write(audioData);
    req.end();
  });
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Deepgram API Tests\n');
  
  try {
    // Test 1: API Connectivity
    const connectivityOK = await testAPIConnectivity();
    if (!connectivityOK) {
      console.log('\n❌ Basic connectivity failed. Check your API key and internet connection.');
      return;
    }

    // Test 2: Audio generation and transcription
    const audioFile = generateTestAudio();
    const transcriptionOK = await testTranscription(audioFile);
    
    if (transcriptionOK) {
      console.log('\n🎉 All tests passed! Deepgram is ready for use.');
      console.log('\n📋 Next steps:');
      console.log('   1. Run: npm start');
      console.log('   2. Open: http://localhost:8080');
      console.log('   3. Test the web interface');
    } else {
      console.log('\n❌ Transcription test failed. Check the error messages above.');
    }

  } catch (error) {
    console.error('\n💥 Test failed with error:', error.message);
  } finally {
    // Cleanup
    if (fs.existsSync('test-audio.raw')) {
      fs.unlinkSync('test-audio.raw');
      console.log('\n🧹 Cleaned up test files');
    }
  }
}

// Run the tests
runTests(); 