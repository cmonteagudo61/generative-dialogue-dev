# Video Conference Speaker Diarization Integration Guide

## 🎯 Current Problem: Single Audio Stream
Your current setup captures one mixed audio stream from your computer's microphone, making speaker separation difficult even with Deepgram's `diarize=true` parameter.

## ✅ Video Conference Solution: Separate Audio Tracks

### Option 1: Daily.co Separate Audio Tracks (Recommended)

```javascript
// Get individual participant audio tracks from Daily.co
function setupSeparateAudioCapture(call) {
    const participants = call.participants();
    const audioProcessors = new Map();
    
    participants.forEach((participant, index) => {
        if (participant.audioTrack && participant.user_name) {
            const speakerName = participant.user_name || `Speaker ${index + 1}`;
            const audioTrack = participant.audioTrack;
            
            // Create separate MediaRecorder for each participant
            const stream = new MediaStream([audioTrack]);
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            
            let audioChunks = [];
            recorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };
            
            recorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                await processSpeakerAudio(audioBlob, speakerName, index);
                audioChunks = [];
            };
            
            audioProcessors.set(participant.session_id, {
                recorder,
                speakerName,
                audioChunks
            });
            
            recorder.start(1000); // Record in 1-second chunks
        }
    });
    
    return audioProcessors;
}

async function processSpeakerAudio(audioBlob, speakerName, speakerIndex) {
    const formData = new FormData();
    formData.append('audio', audioBlob, `${speakerName}_chunk.webm`);
    formData.append('speakerName', speakerName);
    formData.append('speakerIndex', speakerIndex);
    
    try {
        const response = await fetch('/api/transcribe-speaker', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        if (result.success && result.transcript.trim()) {
            displaySpeakerTranscript(speakerName, result.transcript, result.confidence);
        }
    } catch (error) {
        console.error(`Error processing audio for ${speakerName}:`, error);
    }
}
```

### Option 2: Enhanced Single-Stream Processing

```javascript
// Improved single-stream with better parameters
const enhancedDeepgramParams = {
    model: 'nova-2',
    smart_format: true,
    punctuate: true,
    language: 'en',
    diarize: true,
    utterances: true,
    multichannel: false,
    alternatives: 2,
    numerals: true,
    profanity_filter: false,
    redact: false,
    search: [], // Can add keywords to boost recognition
    replace: [], // Can fix common misrecognitions
    filler_words: true // Better for natural conversation
};
```

## 🚀 Implementation Steps for Daily.co Integration

### Step 1: Access Daily.co Audio Tracks
```javascript
// In your main application
import Daily from '@daily-co/daily-js';

const call = Daily.createCallObject();

call.on('participant-joined', (event) => {
    console.log('New participant:', event.participant.user_name);
    setupAudioCapture(event.participant);
});

call.on('track-started', (event) => {
    if (event.track.kind === 'audio') {
        const participant = call.participants()[event.participant.session_id];
        processParticipantAudio(event.track, participant);
    }
});
```

### Step 2: Server-Side Multi-Speaker Processing
```javascript
// Add to speech-poc-test/server.js
app.post('/api/transcribe-speaker', upload.single('audio'), async (req, res) => {
    const speakerName = req.body.speakerName || 'Unknown Speaker';
    const speakerIndex = parseInt(req.body.speakerIndex) || 0;
    
    // Process without diarization since we already know the speaker
    const simplePath = '/v1/listen?model=nova-2&smart_format=true&punctuate=true&language=en';
    
    // ... processing logic ...
    
    res.json({
        success: true,
        transcript: transcript,
        speakerName: speakerName,  // We already know who's speaking!
        speakerIndex: speakerIndex,
        confidence: confidence,
        timestamp: new Date().toISOString()
    });
});
```

### Step 3: Synchronized Transcript Assembly
```javascript
class MultiSpeakerTranscriptManager {
    constructor() {
        this.speakerTranscripts = new Map();
        this.timeline = [];
    }
    
    addSpeakerTranscript(speakerName, transcript, timestamp, confidence) {
        this.timeline.push({
            speaker: speakerName,
            transcript: transcript,
            timestamp: new Date(timestamp),
            confidence: confidence
        });
        
        // Sort by timestamp to maintain conversation flow
        this.timeline.sort((a, b) => a.timestamp - b.timestamp);
        
        this.updateDisplay();
    }
    
    updateDisplay() {
        const conversationDiv = document.getElementById('conversation-transcript');
        conversationDiv.innerHTML = '';
        
        this.timeline.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'speaker-entry';
            div.innerHTML = `
                <span class="speaker-name">${entry.speaker}:</span>
                <span class="transcript-text">${entry.transcript}</span>
                <span class="confidence">(${(entry.confidence * 100).toFixed(1)}%)</span>
            `;
            conversationDiv.appendChild(div);
        });
    }
}
```

## 🔧 Benefits of Video Conference Approach

### Accuracy Improvements
- **Single Stream Diarization**: ~70-80% speaker accuracy
- **Separate Audio Tracks**: ~95-99% speaker accuracy

### Additional Benefits
- **Known Speaker Names**: Instead of "Speaker 0, Speaker 1", you get "Alice, Bob, Carol"
- **No Cross-Talk Confusion**: Separate tracks eliminate overlapping speech issues
- **Better Audio Quality**: Each participant's audio is processed independently
- **Scalability**: Works with 2 participants or 20 participants

## ⚡ Quick Test Implementation

1. **Immediate**: Enhanced single-stream parameters (already applied)
2. **Short-term**: Mock separate speakers by processing chunks with speaker labels
3. **Long-term**: Full Daily.co integration with separate audio tracks

## 🎯 Next Steps Recommendation

1. Test the improved single-stream parameters first
2. Create a proof-of-concept with simulated separate speakers
3. Integrate with your existing Daily.co video conference setup
4. Implement real-time synchronized transcript display

The video conference approach will give you **dramatically better** speaker diarization results compared to trying to separate mixed audio streams. 