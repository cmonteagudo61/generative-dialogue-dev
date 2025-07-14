import React, { useState, useEffect, useRef } from 'react';
import './EnhancedTranscription.css';

const EnhancedTranscription = () => {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [speakerStats, setSpeakerStats] = useState({});
  const [speakerCount, setSpeakerCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState('Ready to transcribe');
  const [error, setError] = useState('');
  
  // Refs for WebSocket and MediaRecorder
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);

  // Enhanced diarization server URL (from our speech-poc-test)
  const DIARIZATION_SERVER = 'http://localhost:8080';

  // Cleanup function
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Start real-time transcription
  const startRealTimeTranscription = async () => {
    try {
      setError('');
      setStatus('Starting microphone...');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      streamRef.current = stream;
      
      // Connect to WebSocket for real-time streaming
      const wsUrl = `ws://localhost:8080/ws/transcribe`;
      console.log('🔌 Attempting WebSocket connection to:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);
      console.log('📡 WebSocket created, readyState:', wsRef.current.readyState);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connected successfully');
        setStatus('Initializing Deepgram...');
        
        // Send start command to server first
        console.log('🚀 Sending start command to server...');
        wsRef.current.send(JSON.stringify({ type: 'start' }));
        
        // Wait a moment for Deepgram to connect before starting recording
        setTimeout(() => {
          setStatus('Connected - Speaking...');
          setIsRecording(true);
          
          // Start recording
          console.log('🎤 Creating MediaRecorder...');
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          
          console.log('✅ MediaRecorder created successfully');
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
              console.log(`📤 Sending audio chunk: ${event.data.size} bytes`);
              wsRef.current.send(event.data);
            } else {
              console.log(`⚠️ Skipping audio chunk - WS readyState: ${wsRef.current?.readyState}, data size: ${event.data.size}`);
            }
          };
          
          console.log('▶️ Starting MediaRecorder...');
          mediaRecorder.start(100); // Send data every 100ms
          console.log('🔴 MediaRecorder started - recording should begin');
        }, 1000); // Give server time to connect to Deepgram
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📥 Received from server:', data);
          
          if (data.type === 'status') {
            setStatus(data.message);
            if (data.connected === false) {
              setError('Deepgram connection lost');
            }
          } else if (data.type === 'transcript') {
            const transcript = data.transcript;
            const confidence = data.confidence || 0;
            const isFinal = data.isFinal || false;
            
            if (isFinal) {
              console.log(`📝 Final transcript: "${transcript}"`);
              setFinalTranscript(prev => {
                const timestamp = new Date().toLocaleTimeString();
                return prev + (prev ? '\n' : '') + `[${timestamp}] ${transcript}`;
              });
              setConfidence(confidence);
            } else {
              console.log(`🔄 Interim transcript: "${transcript}"`);
              setRealtimeTranscript(transcript);
            }
          } else if (data.type === 'error') {
            console.error('❌ Server error:', data.message);
            setError(data.message);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        console.error('❌ WebSocket readyState:', wsRef.current?.readyState);
        setError('Connection error. Please check if the server is running.');
        setStatus('Connection failed');
      };
      
      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setStatus('Disconnected');
        setIsRecording(false);
      };
      
    } catch (error) {
      console.error('Error starting transcription:', error);
      setError('Failed to access microphone. Please check permissions.');
      setStatus('Error');
    }
  };

  // Stop real-time transcription
  const stopRealTimeTranscription = () => {
    console.log('🛑 Stopping transcription...');
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Send stop command to server
      console.log('📤 Sending stop command to server...');
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
      wsRef.current.close();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setIsRecording(false);
    setStatus('Stopped');
    setRealtimeTranscript(''); // Clear interim transcript
  };

  // Handle file upload for transcription
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsTranscribing(true);
    setError('');
    setStatus('Processing audio file...');

    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch(`${DIARIZATION_SERVER}/api/transcribe`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setFinalTranscript(result.speakerTranscript || result.transcript);
        setSpeakerStats(result.speakerStats || {});
        setSpeakerCount(result.speakerCount || 0);
        setConfidence(result.confidence || 0);
        setStatus('Transcription complete');
      } else {
        setError(result.error || 'Transcription failed');
        setStatus('Error');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload file. Please check if the server is running.');
      setStatus('Upload failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Clear transcripts
  const clearTranscripts = () => {
    setRealtimeTranscript('');
    setFinalTranscript('');
    setSpeakerStats({});
    setSpeakerCount(0);
    setConfidence(0);
    setError('');
    setStatus('Cleared');
  };

  return (
    <div className="enhanced-transcription">
      {/* Controls Section */}
      <div className="transcription-controls">
        <div className="control-group">
          <button 
            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
            onClick={isRecording ? stopRealTimeTranscription : startRealTimeTranscription}
            disabled={isTranscribing}
          >
            {isRecording ? '⏹ Stop Recording' : '🎤 Start Live Transcription'}
          </button>
          
          <label className="btn btn-success">
            📁 Upload Audio File
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={isRecording || isTranscribing}
            />
          </label>
          
          <button 
            className="btn btn-warning"
            onClick={clearTranscripts}
            disabled={isRecording || isTranscribing}
          >
            🗑 Clear
          </button>
        </div>
        
        {/* Status and Stats */}
        <div className="status-section">
          <div className={`status ${error ? 'status-error' : 'status-info'}`}>
            {error || status}
          </div>
          
          {confidence > 0 && (
            <div className="speaker-stats">
              <span className="stat-item">📊 {Math.round(confidence * 100)}% confidence</span>
            </div>
          )}
        </div>
      </div>

      {/* Transcription Display */}
      <div className="transcription-display">
        {/* Real-time transcript (only shown during recording) */}
        {isRecording && (
          <div className="realtime-section">
            <h4>🔴 Live Transcription</h4>
            <div className="realtime-transcript">
              {realtimeTranscript || 'Listening...'}
            </div>
          </div>
        )}

        {/* Final transcript with speaker separation */}
        <div className="final-section">
          <h4>📝 Speaker-Separated Transcript</h4>
          <div className="final-transcript">
            {finalTranscript ? (
              <div style={{ whiteSpace: 'pre-wrap' }}>{finalTranscript}</div>
            ) : (
              <div className="placeholder">
                Your transcription will appear here with timestamps...
              </div>
            )}
          </div>
        </div>

        {/* Speaker Statistics - Hidden for now until server provides this data */}
        {false && Object.keys(speakerStats).length > 0 && (
          <div className="speaker-analytics">
            <h4>🎭 Speaker Analytics</h4>
            <div className="speaker-stats-grid">
              {Object.entries(speakerStats).map(([speaker, stats]) => (
                <div key={speaker} className="speaker-stat-card">
                  <div className="speaker-name">{speaker}</div>
                  <div className="speaker-details">
                    <span>🗣 {stats.utteranceCount} utterances</span>
                    <span>⏱ {stats.totalDuration}s</span>
                    <span>📊 {Math.round(stats.averageConfidence * 100)}% avg confidence</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedTranscription; 