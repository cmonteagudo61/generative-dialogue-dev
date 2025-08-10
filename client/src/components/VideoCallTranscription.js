import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVideo } from './VideoProvider';

/**
 * VideoCallTranscription Component
 * Integrates Daily.co video calls with Grok AI real-time transcription
 * Provides speaker identification and live AI insights during video calls
 */
const VideoCallTranscription = ({ 
  onTranscriptUpdate, 
  onSpeakerIdentified, 
  onAIInsight,
  showRealTimeTranscript = true,
  autoStartTranscription = true 
}) => {
  // Video context (for future multi-participant support)
  const { participants, isConnected } = useVideo();
  
  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [speakerMap] = useState({}); // For future speaker identification
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState('Ready for video transcription');
  const [error, setError] = useState('');
  
  // Refs
  const wsRef = useRef(null);
  const audioContextRef = useRef(null); // Now stores { mediaRecorder, stream }
  
  /**
   * Initialize WebSocket connection to AI transcription server
   */
  const initializeWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    try {
      wsRef.current = new WebSocket('ws://localhost:8080/realtime');
      
      wsRef.current.onopen = () => {
        console.log('🎤 Video transcription WebSocket connected');
        setStatus('Connected to AI transcription');
        setError('');
      };
      
              wsRef.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'transcript' && data.transcript) {
              if (data.isFinal) {
                setFinalTranscript(prev => prev + ' ' + data.transcript);
                setRealtimeTranscript('');
                
                // Notify parent component
                onTranscriptUpdate?.({
                  type: 'final',
                  text: data.transcript,
                  confidence: data.confidence,
                  timestamp: data.timestamp || Date.now()
                });
                
              } else {
                setRealtimeTranscript(data.transcript);
                onTranscriptUpdate?.({
                  type: 'interim',
                  text: data.transcript,
                  confidence: data.confidence,
                  timestamp: data.timestamp || Date.now()
                });
              }
              
              setConfidence(data.confidence || 0);
            }
            
            if (data.type === 'status') {
              console.log('🎤 WebSocket status:', data.message);
              setStatus(data.message);
              if (data.connected) {
                setError('');
              }
            }
            
            if (data.type === 'error') {
              console.error('🎤 Transcription error:', data.message);
              setError(data.message);
              setStatus('Transcription error');
            }
            
          } catch (error) {
            console.error('🎤 Error parsing WebSocket message:', error);
          }
        };
      
      wsRef.current.onerror = (error) => {
        console.error('🎤 Video transcription WebSocket error:', error);
        setError('Connection to AI transcription failed');
        setStatus('Connection failed');
      };
      
      wsRef.current.onclose = () => {
        console.log('🎤 Video transcription WebSocket closed');
        setStatus('Disconnected from AI transcription');
      };
      
    } catch (error) {
      console.error('🎤 Error initializing video transcription WebSocket:', error);
      setError('Failed to connect to AI transcription');
    }
  }, [onTranscriptUpdate, onSpeakerIdentified, onAIInsight]);
  
  /**
   * Start simple user audio recording for transcription
   */
  const startAudioRecording = useCallback(async () => {
    try {
      // Get user's microphone
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });
      
      console.log('🎤 Got user media stream for video call transcription');
      
      // Send start command to server
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🚀 Sending start command to transcription server...');
        wsRef.current.send(JSON.stringify({ type: 'start' }));
        
        // Start recording after a brief delay
        setTimeout(() => {
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
          });
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
              console.log(`📤 Sending audio chunk: ${event.data.size} bytes`);
              wsRef.current.send(event.data);
            }
          };
          
          mediaRecorder.start(100); // Send data every 100ms
          
          setIsTranscribing(true);
          setStatus('Transcribing video call with AI');
          
          console.log('🎤 Started audio recording for video transcription');
          
          // Store for cleanup
          audioContextRef.current = { mediaRecorder, stream };
          
        }, 500);
      }
      
    } catch (error) {
      console.error('🎤 Error starting audio recording:', error);
      setError('Failed to start audio recording');
    }
  }, []);
  
  /**
   * Start video call transcription
   */
  const startTranscription = useCallback(async () => {
    try {
      initializeWebSocket();
      
      // Wait for WebSocket to connect before starting audio
      const checkConnection = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          startAudioRecording();
        } else {
          setTimeout(checkConnection, 500);
        }
      };
      
      checkConnection();
      
    } catch (error) {
      console.error('🎤 Error starting video transcription:', error);
      setError('Failed to start transcription');
    }
  }, [initializeWebSocket, startAudioRecording]);
  
  /**
   * Stop video call transcription
   */
  const stopTranscription = useCallback(() => {
    setIsTranscribing(false);
    setStatus('Transcription stopped');
    
    // Clean up audio recording
    if (audioContextRef.current?.mediaRecorder) {
      try {
        audioContextRef.current.mediaRecorder.stop();
      } catch (error) {
        console.log('MediaRecorder already stopped');
      }
    }
    
    if (audioContextRef.current?.stream) {
      audioContextRef.current.stream.getTracks().forEach(track => track.stop());
    }
    
    audioContextRef.current = null;
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    console.log('🎤 Video transcription stopped');
  }, []);
  
  /**
   * Auto-start transcription when component mounts
   */
  // Auto-start transcription for AI processing (re-enabled after disabling EnhancedTranscription)
  useEffect(() => {
    if (autoStartTranscription && !isTranscribing) {
      const timer = setTimeout(() => {
        console.log('🎤 VideoCallTranscription: Auto-starting transcription for AI processing...');
        startTranscription();
      }, 2000); // Give time for component to fully mount
      
      return () => clearTimeout(timer);
    }
  }, [autoStartTranscription, isTranscribing, startTranscription]);
  
  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);
  
  // Render transcription UI
  if (!showRealTimeTranscript) {
    return null;
  }
  
  return (
    <div className="video-call-transcription">
      <div className="transcription-header">
        <div className="transcription-status">
          <span className={`status-indicator ${isTranscribing ? 'active' : 'inactive'}`}>
            {isTranscribing ? '🎤' : '⏸️'}
          </span>
          <span className="status-text">{status}</span>
          {confidence > 0 && (
            <span className="confidence">({Math.round(confidence * 100)}%)</span>
          )}
        </div>
        
        <div className="transcription-controls">
          {!isTranscribing ? (
            <button 
              onClick={startTranscription}
              disabled={!isConnected}
              className="start-transcription-btn"
            >
              Start AI Transcription
            </button>
          ) : (
            <button 
              onClick={stopTranscription}
              className="stop-transcription-btn"
            >
              Stop Transcription
            </button>
          )}
          
          <button 
            onClick={() => {
              console.log('🧪 Testing AI processing with sample text...');
              const testTranscript = {
                type: 'final',
                text: 'Hello everyone, this is a test of our AI processing capabilities. We are discussing artificial intelligence and machine learning technologies.',
                speaker: 'Test Speaker',
                confidence: 0.95,
                timestamp: Date.now()
              };
              onTranscriptUpdate?.(testTranscript);
            }}
            className="test-ai-btn"
            style={{ marginLeft: '10px', backgroundColor: '#28a745', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px' }}
          >
            Test AI Processing
          </button>
        </div>
      </div>
      
      {error && (
        <div className="transcription-error">
          ⚠️ {error}
        </div>
      )}
      
      <div className="transcript-display">
        {finalTranscript && (
          <div className="final-transcript">
            {finalTranscript}
          </div>
        )}
        {realtimeTranscript && (
          <div className="realtime-transcript">
            <em>{realtimeTranscript}</em>
          </div>
        )}
      </div>
      
      {Object.keys(speakerMap).length > 0 && (
        <div className="speaker-identification">
          <h4>Speaker Identification:</h4>
          {Object.entries(speakerMap).map(([aiSpeaker, participantId]) => {
            const participant = participants.find(p => p.session_id === participantId);
            return (
              <div key={aiSpeaker} className="speaker-mapping">
                <span className="ai-speaker">Speaker {aiSpeaker}</span>
                <span className="arrow">→</span>
                <span className="participant-name">
                  {participant?.user_name || participantId}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VideoCallTranscription; 