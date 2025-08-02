import React, { useState, useRef, useCallback } from 'react';
import './BottomContentArea.css';

const BottomContentArea = () => { // Removed all unused props
  const [activeTab, setActiveTab] = useState('dialogue'); // Default to dialogue tab
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('Disconnected');
  const [finalTranscript, setFinalTranscript] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const connectionLockRef = useRef(false);
  const CONNECTION_DEBOUNCE_MS = 2000;
  
  const stopRealTimeTranscription = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    setIsRecording(false);
  }, []);

  const startRealTimeTranscription = useCallback(() => {
    if (connectionLockRef.current || isConnecting) {
      console.warn('⚠️ Connection attempt blocked by lock or already in progress.');
      return;
    }

    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_DEBOUNCE_MS) {
      console.warn('⚠️ Connection attempt blocked by debounce.');
      return;
    }

    connectionLockRef.current = true;
    setIsConnecting(true);
    setLastConnectionAttempt(now);
    setTranscriptionStatus('Connecting...');

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
        const newMediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = newMediaRecorder;

        wsRef.current = new WebSocket('ws://localhost:8080/realtime');

        wsRef.current.onopen = () => {
          console.log('🔌 WebSocket connection established.');
          setTranscriptionStatus('Connected');
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.start(500);
          }
        };

        wsRef.current.onmessage = event => {
          const data = JSON.parse(event.data);
          if (data.type === 'final') {
            setFinalTranscript(prev => `${prev}\n${data.transcript}`);
          }
        };

        wsRef.current.onerror = error => {
          console.error('WebSocket Error:', error);
          setTranscriptionStatus('Error');
          stopRealTimeTranscription();
        };

        wsRef.current.onclose = () => {
          console.log('🔌 WebSocket connection closed.');
          setTranscriptionStatus('Disconnected');
          stopRealTimeTranscription();
        };

        newMediaRecorder.ondataavailable = event => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        };

        setIsRecording(true);
      })
      .catch(err => {
        console.error('Error getting user media:', err);
        setTranscriptionStatus('Error');
      })
      .finally(() => {
        connectionLockRef.current = false;
        setIsConnecting(false);
      });
  }, [isConnecting, lastConnectionAttempt, stopRealTimeTranscription]);
  
  const startRecording = () => {
    startRealTimeTranscription();
  };

  const stopRecording = () => {
    stopRealTimeTranscription();
  };

  const clearTranscription = useCallback(() => {
    stopRealTimeTranscription();
    setFinalTranscript('');
  }, [stopRealTimeTranscription]);

  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const isConnected = transcriptionStatus === 'Connected' || isRecording;

  return (
    <div className="bottom-content-area">
      <div className="tab-area">
        <div className="tab-navigation">
          <div className="tab-controls-left">
            <div 
              className={`tab-btn ${activeTab === 'catalyst' ? 'active' : ''}`}
              onClick={() => switchTab('catalyst')}
              title="Catalyst - instructions and activities to help catalyze an effective dialogue."
            >
              Catalyst
            </div>
            <div 
              className={`tab-btn ${activeTab === 'dialogue' ? 'active' : ''}`}
              onClick={() => switchTab('dialogue')}
              title="Dialogue - Live transcription and conversation content"
            >
              Dialogue
            </div>
            <div 
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => switchTab('summary')}
              title="Summary - AI-generated insights and voting"
            >
              Summary
            </div>
            <div 
              className={`tab-btn ${activeTab === 'we' ? 'active' : ''}`}
              onClick={() => switchTab('we')}
              title="WE - Collective wisdom and voices from the field"
            >
              WE
            </div>
          </div>
          
          <div className="tab-controls-right">
            <button 
              className="transcription-control-btn primary"
              onClick={startRecording}
              disabled={isConnected}
              title="Start live transcription with AI processing"
            >
              <span className="btn-icon" style={{ color: 'initial' }}>🎤</span>
              <span className="btn-text">Start</span>
            </button>

            <button 
              className="transcription-control-btn"
              onClick={clearTranscription}
              title="Clear all transcription data and AI summaries"
            >
              <span className="btn-icon" style={{ color: 'initial' }}>🗑️</span>
              <span className="btn-text">Clear</span>
            </button>
            
            <button 
              className="transcription-control-btn danger"
              onClick={stopRecording}
              disabled={!isConnected}
              title="Disconnect from live transcription"
            >
              <span className="btn-icon" style={{ color: 'initial' }}>🚫</span>
              <span className="btn-text">Disconnect</span>
            </button>
          </div>
        </div>
        
        <div className="tab-content">
          {activeTab === 'dialogue' && (
            <div style={{ padding: '1rem', color: 'black', whiteSpace: 'pre-wrap' }}>
                {finalTranscript}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomContentArea;
