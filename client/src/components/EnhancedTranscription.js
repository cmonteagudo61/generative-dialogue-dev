import React, { useState, useEffect, useRef, useCallback } from 'react';
import './EnhancedTranscription.css';

const EnhancedTranscription = ({
  isRecording,
  startRecording,
  stopRecording,
  clearTranscription,
  getStatusClass,
  onAITranscriptUpdate, // Callback for AI-enhanced transcript
  onAISummaryUpdate     // Callback for AI summary
}) => {
  // State management
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [realtimeTranscript, setRealtimeTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [speakerStats, setSpeakerStats] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [speakerCount, setSpeakerCount] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState('Ready to transcribe');
  const [error, setError] = useState('');

  // Enhanced transcript state
  const [enhancedTranscript, setEnhancedTranscript] = useState('');
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editableTranscript, setEditableTranscript] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryVote, setSummaryVote] = useState(null); // 'up', 'down', or null
  
  // Tooltip state for middle control buttons
  const [showMicTooltip, setShowMicTooltip] = useState(false);
  const [showUploadTooltip, setShowUploadTooltip] = useState(false);
  const [showClearTooltip, setShowClearTooltip] = useState(false);

  // Force mobile mode for testing
  const [forceMobileMode, setForceMobileMode] = useState(false);

  // Tooltip timeout refs
  const micTooltipTimeout = useRef(null);
  const uploadTooltipTimeout = useRef(null);
  const clearTooltipTimeout = useRef(null);

  // Press timeout refs for mobile long-press
  const micPressTimeout = useRef(null);
  const uploadPressTimeout = useRef(null);
  const clearPressTimeout = useRef(null);

  // Auto-hide timeout refs for mobile
  const micAutoHideTimeout = useRef(null);
  const uploadAutoHideTimeout = useRef(null);
  const clearAutoHideTimeout = useRef(null);
  
  // Refs for WebSocket and MediaRecorder
  const mediaRecorderRef = useRef(null);
  const wsRef = useRef(null);
  const streamRef = useRef(null);

  // Enhanced diarization server URL (from our speech-poc-test)
  const DIARIZATION_SERVER = 'http://localhost:8080';

  // Server configuration
  const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:8080';

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
  const showTooltipWithDelay = useCallback((setTooltip, timeoutRef, delay = 2000) => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      console.log('✅ TRANSCRIPTION: Tooltip appearing');
      setTooltip(true);
    }, delay);
  }, []);

  const showTooltipImmediately = (setTooltip) => {
    console.log('⚡ TRANSCRIPTION: showTooltipImmediately called');
    setTooltip(true);
  };

  const hideTooltipImmediately = useCallback((setTooltip, timeoutRef, pressTimeoutRef = null, autoHideTimeoutRef = null) => {
    clearTimeout(timeoutRef.current);
    if (pressTimeoutRef) clearTimeout(pressTimeoutRef.current);
    if (autoHideTimeoutRef) clearTimeout(autoHideTimeoutRef.current);
    setTooltip(false);
  }, []);

  // Device detection and tooltip positioning
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

  // Universal event handlers that work on both desktop and mobile
  const createTooltipHandlers = useCallback((setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef) => {
    const handlers = {
      // Desktop hover events
      onMouseEnter: () => {
        if (!isTouchDevice) { // Desktop/laptop with mouse - always use hover
          showTooltipWithDelay(setTooltip, timeoutRef);
        }
      },
      onMouseLeave: () => {
        if (!isTouchDevice) { // Desktop
          hideTooltipImmediately(setTooltip, timeoutRef, pressTimeoutRef, autoHideTimeoutRef);
        }
      },
      // Mobile touch events
      onTouchStart: () => {
        if (isTouchDevice) {
          clearTimeout(pressTimeoutRef.current);
          clearTimeout(autoHideTimeoutRef.current);
          pressTimeoutRef.current = setTimeout(() => {
            setTooltip(true);
            // Auto-hide after 4 seconds
            autoHideTimeoutRef.current = setTimeout(() => {
              setTooltip(false);
            }, 4000);
          }, 1000);
        }
      },
      onTouchEnd: () => {
        if (isTouchDevice) {
          clearTimeout(pressTimeoutRef.current);
          // Let auto-hide timeout continue if tooltip is showing
        }
      },
      onTouchCancel: () => {
        if (isTouchDevice) {
          clearTimeout(pressTimeoutRef.current);
          clearTimeout(autoHideTimeoutRef.current);
          setTooltip(false);
        }
      }
    };
    
    return handlers;
  }, [isTouchDevice, showTooltipWithDelay, hideTooltipImmediately]);

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
      const wsUrl = `ws://localhost:8080/realtime`;
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
          startRecording();
          
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
        stopRecording();
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
    
    stopRecording();
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

  // AI Enhancement Functions
  const enhanceTranscriptWithAI = async (rawTranscript) => {
    if (!rawTranscript || rawTranscript.length < 10) return;
    
    console.log('🤖 Sending transcript for AI enhancement...');
    setIsEnhancing(true);
    
    try {
      const response = await fetch(`${SERVER_URL}/api/enhance-transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: rawTranscript,
          options: {
            improvePunctuation: true,
            fixGrammar: true,
            enhanceReadability: true,
            maintainSpeakerVoice: true,
            addParagraphs: true
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setEnhancedTranscript(result.enhanced);
        setEditableTranscript(result.enhanced);
        console.log('✅ AI enhancement complete');
      } else {
        console.error('❌ AI enhancement failed:', result.error);
        setError('AI enhancement failed: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Enhancement error:', error);
      setError('Failed to enhance transcript. Server may be unavailable.');
    } finally {
      setIsEnhancing(false);
    }
  };

  const generateAISummary = async (transcript) => {
    if (!transcript || transcript.length < 20) return;
    
    console.log('📝 Generating AI summary...');
    setIsGeneratingSummary(true);
    
    try {
      const response = await fetch(`${SERVER_URL}/api/ai/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transcript: transcript
        })
      });

      const result = await response.json();
      
      if (result.summary) {
        setAiSummary(result.summary);
        console.log('✅ AI summary generated');
      } else {
        console.error('❌ Summary generation failed');
        setError('Failed to generate AI summary');
      }
    } catch (error) {
      console.error('❌ Summary error:', error);
      setError('Failed to generate summary. Server may be unavailable.');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // Editing functions
  const startEditingTranscript = () => {
    setIsEditingTranscript(true);
    setEditableTranscript(enhancedTranscript || finalTranscript);
  };

  const saveTranscriptEdits = () => {
    setEnhancedTranscript(editableTranscript);
    setIsEditingTranscript(false);
    // Notify parent and auto-generate summary after editing
    onAITranscriptUpdate?.(editableTranscript);
    generateAISummary(editableTranscript);
  };

  const cancelTranscriptEdits = () => {
    setEditableTranscript(enhancedTranscript || finalTranscript);
    setIsEditingTranscript(false);
  };

  const submitForSummary = () => {
    const transcriptToSummarize = enhancedTranscript || finalTranscript;
    generateAISummary(transcriptToSummarize);
  };

  // Voting functions
  const voteOnSummary = (vote) => {
    setSummaryVote(vote);
    console.log(`📊 Summary vote: ${vote}`);
    // Here you could send the vote to the backend
    // onSummaryVote?.(vote, aiSummary);
  };

  // Notify parent when AI enhancement is complete
  useEffect(() => {
    if (enhancedTranscript) {
      onAITranscriptUpdate?.(enhancedTranscript);
    }
  }, [enhancedTranscript, onAITranscriptUpdate]);

  // Notify parent when AI summary is generated
  useEffect(() => {
    if (aiSummary) {
      onAISummaryUpdate?.(aiSummary);
    }
  }, [aiSummary, onAISummaryUpdate]);

  // Auto-enhance transcript when final transcript is available
  useEffect(() => {
    if (finalTranscript && finalTranscript !== enhancedTranscript) {
      // Debounce enhancement to avoid too many API calls
      const timer = setTimeout(() => {
        enhanceTranscriptWithAI(finalTranscript);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [finalTranscript, enhancedTranscript]);

  return (
    <div className="enhanced-transcription" style={{marginTop: '10px'}}>
      {/* Clean Transcription Controls */}
      <div className="transcription-controls">
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px'}}>
          <button 
            onClick={() => isRecording ? stopRealTimeTranscription() : startRealTimeTranscription()}
            disabled={isTranscribing}
            style={{
              backgroundColor: isRecording ? '#dc3545' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: isTranscribing ? 'not-allowed' : 'pointer',
              opacity: isTranscribing ? 0.6 : 1
            }}
          >
            {isRecording ? '⏹ Stop Transcription' : '🎤 Start Live Transcription'}
          </button>
          
          <div style={{
            fontSize: '14px',
            color: isRecording ? '#28a745' : error ? '#dc3545' : '#666',
            fontWeight: '500'
          }}>
            {status}
          </div>
          
          {(realtimeTranscript || finalTranscript) && (
            <button 
              onClick={clearTranscripts}
              style={{
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                color: '#666',
                padding: '8px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          )}
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

      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px',
          fontSize: '14px'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Live Transcript Display */}
      {isRecording && (
        <div style={{
          backgroundColor: '#f0f8ff',
          border: '1px solid #b3d9ff',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#0066cc',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{color: '#dc3545'}}>🔴</span>
            Live Transcript (2-3 lines for confidence)
          </div>
          <div style={{
            fontSize: '14px',
            lineHeight: '1.5',
            minHeight: '60px',
            maxHeight: '90px', // Limit to ~3 lines
            overflowY: 'auto',
            color: realtimeTranscript ? '#333' : '#999',
            fontStyle: realtimeTranscript ? 'normal' : 'italic',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            padding: '8px',
            borderRadius: '4px'
          }}>
            {realtimeTranscript || 'Listening for speech...'}
          </div>
        </div>
      )}

      {/* Final Transcript Display - Raw from Deepgram */}
      {finalTranscript && !enhancedTranscript && (
        <div style={{
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#495057',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>📝 Raw Transcript</span>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              {confidence > 0 && (
                <span style={{fontSize: '11px', color: '#666'}}>
                  Confidence: {Math.round(confidence * 100)}%
                </span>
              )}
              {isEnhancing && (
                <span style={{fontSize: '11px', color: '#28a745'}}>🤖 AI Enhancing...</span>
              )}
            </div>
          </div>
          <div style={{
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {finalTranscript}
          </div>
        </div>
      )}

      {/* Enhanced Transcript Display */}
      {enhancedTranscript && (
        <div style={{
          backgroundColor: '#e8f5e8',
          border: '2px solid #28a745',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#155724',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>🤖 AI-Enhanced Transcript</span>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              {!isEditingTranscript ? (
                <>
                  <button
                    onClick={startEditingTranscript}
                    style={{
                      backgroundColor: '#ffc107',
                      color: '#212529',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={submitForSummary}
                    disabled={isGeneratingSummary}
                    style={{
                      backgroundColor: '#17a2b8',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: isGeneratingSummary ? 'not-allowed' : 'pointer',
                      fontWeight: '600',
                      opacity: isGeneratingSummary ? 0.6 : 1
                    }}
                  >
                    {isGeneratingSummary ? 'Generating...' : 'Generate Summary'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={saveTranscriptEdits}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelTranscriptEdits}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isEditingTranscript ? (
            <textarea
              value={editableTranscript}
              onChange={(e) => setEditableTranscript(e.target.value)}
              style={{
                width: '100%',
                fontSize: '14px',
                lineHeight: '1.6',
                minHeight: '120px',
                maxHeight: '200px',
                overflowY: 'auto',
                backgroundColor: 'white',
                padding: '10px',
                borderRadius: '4px',
                border: '2px solid #28a745',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
              placeholder="Edit the enhanced transcript for accuracy..."
            />
          ) : (
            <div style={{
              fontSize: '14px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              maxHeight: '200px',
              overflowY: 'auto',
              backgroundColor: 'white',
              padding: '10px',
              borderRadius: '4px',
              border: '1px solid #e9ecef'
            }}>
              {enhancedTranscript}
            </div>
          )}
        </div>
      )}

      {/* AI Summary Display */}
      {aiSummary && (
        <div style={{
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '6px',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#155724',
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>📝 AI Summary</span>
            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
              {isGeneratingSummary && (
                <span style={{fontSize: '11px', color: '#6c757d'}}>Generating...</span>
              )}
              {!isGeneratingSummary && (
                <div style={{display: 'flex', gap: '4px', alignItems: 'center'}}>
                  <span style={{fontSize: '11px', color: '#495057', marginRight: '4px'}}>
                    Rate this summary:
                  </span>
                  <button
                    onClick={() => voteOnSummary('up')}
                    style={{
                      backgroundColor: summaryVote === 'up' ? '#28a745' : '#f8f9fa',
                      color: summaryVote === 'up' ? 'white' : '#28a745',
                      border: `1px solid #28a745`,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => voteOnSummary('down')}
                    style={{
                      backgroundColor: summaryVote === 'down' ? '#dc3545' : '#f8f9fa',
                      color: summaryVote === 'down' ? 'white' : '#dc3545',
                      border: `1px solid #dc3545`,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    👎
                  </button>
                  {summaryVote && (
                    <span style={{fontSize: '11px', color: '#6c757d', marginLeft: '4px'}}>
                      Thanks for voting!
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{
            fontSize: '14px',
            lineHeight: '1.6',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid #e9ecef'
          }}>
            {aiSummary}
          </div>
        </div>
      )}

      {/* Speaker Statistics */}
      {Object.keys(speakerStats).length > 0 && (
        <div style={{
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          padding: '15px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#856404',
            marginBottom: '10px'
          }}>
            🎤 Speakers Identified: {Object.keys(speakerStats).length}
          </div>
          <div style={{display: 'grid', gap: '5px'}}>
            {Object.entries(speakerStats).map(([speaker, stats]) => (
              <div key={speaker} style={{
                fontSize: '13px',
                padding: '5px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span><strong>{speaker}</strong></span>
                <span>{stats.duration}s</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state when not recording and no transcript */}
      {!isRecording && !finalTranscript && !error && (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#666',
          fontSize: '14px',
          backgroundColor: '#f8f9fa',
          borderRadius: '6px',
          border: '1px dashed #dee2e6'
        }}>
          <div style={{fontSize: '24px', marginBottom: '10px'}}>🎤</div>
          <div style={{marginBottom: '5px'}}>Ready to start transcription</div>
          <div style={{fontSize: '12px', color: '#999'}}>
            Click "Start Live Transcription" to begin
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTranscription; 