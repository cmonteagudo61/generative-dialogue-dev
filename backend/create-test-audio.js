/**
 * Generate a simple test audio file for Deepgram compatibility testing
 * This creates a synthetic speech audio file in a format that Deepgram handles well
 */

const fs = require('fs');
const path = require('path');

// Create a simple WAV file with test speech
function createTestWAV() {
    const sampleRate = 16000; // 16kHz - good for speech recognition
    const duration = 3; // 3 seconds
    const numSamples = sampleRate * duration;
    
    // Generate a simple sine wave pattern that mimics speech formants
    const samples = [];
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        // Create a complex wave that sounds more like speech
        const f1 = 200 + 100 * Math.sin(2 * Math.PI * 0.5 * t); // Fundamental frequency variation
        const f2 = 800 + 200 * Math.sin(2 * Math.PI * 0.3 * t); // First formant
        const f3 = 2400 + 300 * Math.sin(2 * Math.PI * 0.2 * t); // Second formant
        
        const amplitude = 0.3 * Math.exp(-t * 0.5); // Decay envelope
        const sample = amplitude * (
            Math.sin(2 * Math.PI * f1 * t) * 0.4 +
            Math.sin(2 * Math.PI * f2 * t) * 0.3 +
            Math.sin(2 * Math.PI * f3 * t) * 0.2
        );
        
        // Convert to 16-bit PCM
        samples.push(Math.round(sample * 32767));
    }
    
    // Create WAV file header
    const buffer = Buffer.alloc(44 + samples.length * 2);
    let offset = 0;
    
    // RIFF header
    buffer.write('RIFF', offset); offset += 4;
    buffer.writeUInt32LE(36 + samples.length * 2, offset); offset += 4;
    buffer.write('WAVE', offset); offset += 4;
    
    // fmt chunk
    buffer.write('fmt ', offset); offset += 4;
    buffer.writeUInt32LE(16, offset); offset += 4; // PCM format
    buffer.writeUInt16LE(1, offset); offset += 2; // Audio format
    buffer.writeUInt16LE(1, offset); offset += 2; // Number of channels
    buffer.writeUInt32LE(sampleRate, offset); offset += 4; // Sample rate
    buffer.writeUInt32LE(sampleRate * 2, offset); offset += 4; // Byte rate
    buffer.writeUInt16LE(2, offset); offset += 2; // Block align
    buffer.writeUInt16LE(16, offset); offset += 2; // Bits per sample
    
    // data chunk
    buffer.write('data', offset); offset += 4;
    buffer.writeUInt32LE(samples.length * 2, offset); offset += 4;
    
    // Write samples
    for (let i = 0; i < samples.length; i++) {
        buffer.writeInt16LE(samples[i], offset);
        offset += 2;
    }
    
    return buffer;
}

// Create the test file
const testAudio = createTestWAV();
const filename = 'test-speech.wav';
fs.writeFileSync(filename, testAudio);

console.log(`✅ Created test audio file: ${filename}`);
console.log(`📋 Format: WAV, 16kHz, 16-bit PCM, Mono`);
console.log(`⏱️  Duration: 3 seconds`);
console.log(`📁 Size: ${testAudio.length} bytes`);
console.log(`🎯 This format is highly compatible with Deepgram`); 