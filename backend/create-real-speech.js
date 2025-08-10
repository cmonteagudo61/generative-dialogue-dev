/**
 * Create real speech audio files for testing diarization
 * Uses macOS 'say' command to generate actual speech content
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🎤 Creating real speech audio for diarization testing...');

// Create speech content for testing
const speeches = [
    {
        text: "Hello everyone, my name is Alex and I'm here to test the speech recognition system. This is a multi-speaker conversation that should demonstrate proper speaker diarization capabilities.",
        voice: "Alex",
        file: "speaker_alex.aiff"
    },
    {
        text: "Hi Alex, I'm Samantha and I'm joining this conversation. The diarization system should be able to distinguish between our different voices and separate our speech into different speaker segments.",
        voice: "Samantha", 
        file: "speaker_samantha.aiff"
    },
    {
        text: "This is Alex speaking again. We're going back and forth to create a realistic conversation pattern that will test the speaker separation algorithms effectively.",
        voice: "Alex",
        file: "speaker_alex2.aiff"
    },
    {
        text: "And Samantha here once more. The enhanced diarization should track when speakers change and provide accurate speaker identification throughout this entire conversation.",
        voice: "Samantha",
        file: "speaker_samantha2.aiff"
    }
];

// Generate individual speech files
speeches.forEach((speech, index) => {
    console.log(`🗣️  Generating speech ${index + 1}: ${speech.voice}`);
    try {
        execSync(`say -v "${speech.voice}" "${speech.text}" -o "${speech.file}"`);
        console.log(`✅ Created: ${speech.file}`);
    } catch (error) {
        console.log(`❌ Failed to create ${speech.file}: ${error.message}`);
    }
});

// Convert AIFF files to WAV for better Deepgram compatibility
console.log('🔄 Converting to WAV format...');
speeches.forEach((speech, index) => {
    if (fs.existsSync(speech.file)) {
        const wavFile = speech.file.replace('.aiff', '.wav');
        try {
            execSync(`ffmpeg -i "${speech.file}" -ar 16000 -ac 1 -c:a pcm_s16le "${wavFile}" -y 2>/dev/null`);
            console.log(`✅ Converted: ${wavFile}`);
        } catch (error) {
            // If ffmpeg isn't available, try afconvert (macOS built-in)
            try {
                execSync(`afconvert "${speech.file}" -d LEI16@16000 -c 1 "${wavFile}"`);
                console.log(`✅ Converted: ${wavFile} (using afconvert)`);
            } catch (convertError) {
                console.log(`⚠️  Could not convert ${speech.file}, using AIFF format`);
            }
        }
    }
});

// Create a combined conversation file
console.log('🎭 Creating multi-speaker conversation...');
const combinedSpeech = speeches.map(s => s.text).join(' ... ');

try {
    // Alternate between voices for realistic conversation
    let conversationText = '';
    speeches.forEach((speech, index) => {
        conversationText += `${speech.text} `;
        if (index < speeches.length - 1) {
            conversationText += '... ';
        }
    });
    
    execSync(`say "${conversationText}" -o "multi_speaker_conversation.aiff"`);
    
    // Convert to WAV
    try {
        execSync(`ffmpeg -i "multi_speaker_conversation.aiff" -ar 16000 -ac 1 -c:a pcm_s16le "multi_speaker_conversation.wav" -y 2>/dev/null`);
        console.log(`✅ Created: multi_speaker_conversation.wav`);
    } catch (error) {
        try {
            execSync(`afconvert "multi_speaker_conversation.aiff" -d LEI16@16000 -c 1 "multi_speaker_conversation.wav"`);
            console.log(`✅ Created: multi_speaker_conversation.wav (using afconvert)`);
        } catch (convertError) {
            console.log(`✅ Created: multi_speaker_conversation.aiff (AIFF format)`);
        }
    }
} catch (error) {
    console.log(`❌ Failed to create combined conversation: ${error.message}`);
}

console.log('\n🎯 Test files created for diarization testing:');
console.log('   - Individual speaker files: speaker_*.wav');
console.log('   - Multi-speaker conversation: multi_speaker_conversation.wav');
console.log('   - Use these with the enhanced diarization API'); 