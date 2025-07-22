import React, { useState, useEffect, useRef } from 'react';
import './EnhancedTranscription.css';

const EnhancedTranscription = () => {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [speakerStats, setSpeakerStats] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [speakerCount, setSpeakerCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState('Ready to transcribe');
  const [error, setError] = useState('');

  // Tooltip state for middle control buttons
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showUploadTooltip, setShowUploadTooltip] = useState(false);
  const [showClearTooltip, setShowClearTooltip] = useState(false);

  // Tooltip timeout refs
  const micTooltipTimeout = useRef(null);
  const uploadTooltipTimeout = useRef(null);
  const clearTooltipTimeout = useRef(null);

  // Press timeout refs for mobile long-press
  const micPressTimeout = useRef(null);
  const uploadPressTimeout = useRef(null);
  const clearPressTimeout = useRef(null);

  // Auto-hide timeout refs for mobile tooltips
  const micAutoHideTimeout = useRef(null);
  const uploadAutoHideTimeout = useRef(null);
  const clearAutoHideTimeout = useRef(null);
  
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
      clearTimeout(micTooltipTimeout.current);
      clearTimeout(uploadTooltipTimeout.current);
      clearTimeout(clearTooltipTimeout.current);
      clearTimeout(micPressTimeout.current);
      clearTimeout(uploadPressTimeout.current);
      clearTimeout(clearPressTimeout.current);
      clearTimeout(micAutoHideTimeout.current);
      clearTimeout(uploadAutoHideTimeout.current);
      clearTimeout(clearAutoHideTimeout.current);
    };
  }, []);

  // Tooltip utility functions
  const showTooltipWithDelay = (setTooltip, timeoutRef, delay = 2000) => {
    console.log('⏰ TRANSCRIPTION: showTooltipWithDelay called with delay:', delay);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ TRANSCRIPTION: TIMEOUT FIRED: Setting tooltip to true');
      setTooltip(true);
    }, delay);
  };

  const showTooltipImmediately = (setTooltip) => {
    console.log('⚡ TRANSCRIPTION: showTooltipImmediately called');
    setTooltip(true);
  };

  const hideTooltipImmediately = (setTooltip, timeoutRef, pressTimeoutRef = null, autoHideTimeoutRef = null) => {
    console.log('❌ TRANSCRIPTION: hideTooltipImmediately called');
    clearTimeout(timeoutRef.current);
    if (pressTimeoutRef) clearTimeout(pressTimeoutRef.current);
    if (autoHideTimeoutRef) clearTimeout(autoHideTimeoutRef.current);
    setTooltip(false);
  };

  // Device detection and tooltip positioning
  const [forceMobileMode, setForceMobileMode] = useState(false);
  const isTouchDevice = forceMobileMode || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  // Get tooltip position relative to button
  const getTooltipPosition = (buttonId) => {
    const button = document.getElementById(buttonId);
    if (!button) return { left: '50%', top: '50%' };

    const buttonRect = button.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonRight = buttonRect.right;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;

    // Position tooltip to the right of the button with left-pointing arrow
    let leftPosition = buttonRight + 15;
    let topPosition = buttonCenterY;

    // Check bounds for left/right edge clipping
    const tooltipWidth = 200; // Estimated tooltip width
    const viewportWidth = window.innerWidth;
    
    if (leftPosition + tooltipWidth > viewportWidth - 10) {
      // If tooltip would go off right edge, position to left of button
      leftPosition = buttonRect.left - tooltipWidth - 15;
    }
    
    if (leftPosition < 10) {
      // If still off left edge, center above button
      leftPosition = buttonCenterX;
      topPosition = buttonRect.top - 10;
    }

    // Check bounds for top/bottom edge clipping
    const tooltipHeight = 50; // Estimated tooltip height
    const viewportHeight = window.innerHeight;
    
    if (topPosition - tooltipHeight/2 < 10) {
      topPosition = tooltipHeight/2 + 10;
    }
    if (topPosition + tooltipHeight/2 > viewportHeight - 10) {
      topPosition = viewportHeight - tooltipHeight/2 - 10;
    }

    return {
      left: `${leftPosition}px`,
      top: `${topPosition}px`,
      transform: 'translateY(-50%)'
    };
  };

  // Universal event handlers for tooltips
  const createTooltipHandlers = (setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef) => ({
    // Desktop hover events
    onMouseEnter: () => {
      console.log('🖱️ TRANSCRIPTION HOVER START - Touch device?', isTouchDevice);
      if (!isTouchDevice) {
        console.log('🖱️ TRANSCRIPTION: Starting 2s delay for tooltip');
        showTooltipWithDelay(setTooltip, timeoutRef);
      } else {
        console.log('🖱️ TRANSCRIPTION: Ignoring hover (use touch instead)');
      }
    },
    onMouseLeave: () => {
      console.log('🖱️ TRANSCRIPTION HOVER END');
      if (!isTouchDevice) {
        console.log('🖱️ TRANSCRIPTION: Hiding tooltip immediately');
        hideTooltipImmediately(setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef);
      }
    },
    // Mobile/tablet touch events
    onTouchStart: () => {
      console.log('👆 TRANSCRIPTION TOUCH START - Touch device?', isTouchDevice);
      if (isTouchDevice) {
        // Clear any existing timeouts
        clearTimeout(pressTimeoutRef.current);
        clearTimeout(autoHideTimeoutRef.current);
        
        console.log('👆 TRANSCRIPTION: Starting 1s press timeout');
        pressTimeoutRef.current = setTimeout(() => {
          console.log('👆 TRANSCRIPTION: Long press detected, showing tooltip');
          showTooltipImmediately(setTooltip);
          
          // Auto-hide after 4 seconds on mobile
          autoHideTimeoutRef.current = setTimeout(() => {
            console.log('👆 TRANSCRIPTION: Auto-hiding tooltip after 4s');
            hideTooltipImmediately(setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef);
          }, 4000);
        }, 1000);
      }
    },
    onTouchEnd: () => {
      console.log('👆 TRANSCRIPTION TOUCH END');
      if (isTouchDevice) {
        clearTimeout(pressTimeoutRef.current);
      }
    },
    onTouchCancel: () => {
      console.log('👆 TRANSCRIPTION TOUCH CANCEL');
      if (isTouchDevice) {
        hideTooltipImmediately(setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef);
      }
    }
  });

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
            id="transcription-mic-btn"
            className={`btn ${isRecording ? 'btn-danger' : 'btn-primary'}`}
            onClick={(e) => {
              hideTooltipImmediately(setShowMicTooltip, micTooltipTimeout, micPressTimeout, micAutoHideTimeout);
              isRecording ? stopRealTimeTranscription() : startRealTimeTranscription();
            }}
            disabled={isTranscribing}
            {...createTooltipHandlers(setShowMicTooltip, micTooltipTimeout, micPressTimeout, micAutoHideTimeout)}
          >
            {isRecording ? '⏹ Stop Recording' : '🎤 Start Live Transcription'}
          </button>
          
          <label 
            id="transcription-upload-btn"
            className="btn btn-success"
            {...createTooltipHandlers(setShowUploadTooltip, uploadTooltipTimeout, uploadPressTimeout, uploadAutoHideTimeout)}
          >
            📁 Upload Audio File
            <input 
              type="file" 
              accept="audio/*" 
              onChange={(e) => {
                hideTooltipImmediately(setShowUploadTooltip, uploadTooltipTimeout, uploadPressTimeout, uploadAutoHideTimeout);
                handleFileUpload(e);
              }}
              style={{ display: 'none' }}
              disabled={isRecording || isTranscribing}
            />
          </label>
          
          <button 
            id="transcription-clear-btn"
            className="btn btn-warning"
            onClick={(e) => {
              hideTooltipImmediately(setShowClearTooltip, clearTooltipTimeout, clearPressTimeout, clearAutoHideTimeout);
              clearTranscripts();
            }}
            disabled={isRecording || isTranscribing}
            {...createTooltipHandlers(setShowClearTooltip, clearTooltipTimeout, clearPressTimeout, clearAutoHideTimeout)}
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

      {/* Tooltip Elements */}
      {showMicTooltip && (
        <div 
          style={{
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 10000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            ...getTooltipPosition('transcription-mic-btn')
          }}
        >
          {isRecording ? '⏹ Stop audio recording' : '🎤 Start live transcription'}
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {showUploadTooltip && (
        <div 
          style={{
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 10000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            ...getTooltipPosition('transcription-upload-btn')
          }}
        >
          📁 Upload audio file for transcription
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {showClearTooltip && (
        <div 
          style={{
            position: 'fixed',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
            zIndex: 10000,
            pointerEvents: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            ...getTooltipPosition('transcription-clear-btn')
          }}
        >
          🗑 Clear all transcriptions
          <div style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '0',
            height: '0',
            borderTop: '6px solid transparent',
            borderBottom: '6px solid transparent',
            borderRight: '6px solid rgba(0, 0, 0, 0.9)'
          }} />
        </div>
      )}

      {/* Debug Display for Testing (can be removed later) */}
      {(showMicTooltip || showUploadTooltip || showClearTooltip) && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 10001,
          border: '1px solid #ccc'
        }}>
          🔧 TRANSCRIPTION TOOLTIPS<br/>
          Width: {window.innerWidth}px<br/>
          Touch Device: {isTouchDevice ? 'Yes' : 'No'}<br/>
          <span 
            style={{cursor: 'pointer', color: 'blue', textDecoration: 'underline'}}
            onClick={() => setForceMobileMode(!forceMobileMode)}
          >
            Force Mobile: {forceMobileMode ? 'ON' : 'OFF'}
          </span><br/>
          Event Mode: {isTouchDevice ? 'Touch' : 'Hover'}
        </div>
      )}
    </div>
  );
};

export default EnhancedTranscription; 