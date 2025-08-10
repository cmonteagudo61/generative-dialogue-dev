import React, { useEffect, useRef, useState, useCallback } from 'react';

const AudioStreamer = ({ 
  isRecording,
  onTranscriptionUpdate,
  onSpeakerIdentified,
  onAIInsight,
}) => {
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  const stopStreaming = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
  }, []);

  const startStreaming = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      console.log('Audio streamer is already recording.');
      return;
    }

    setStatus('connecting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const socket = new WebSocket('ws://localhost:8080/ws/transcribe');
      wsRef.current = socket;
      
      socket.onopen = () => {
        console.log('AudioStreamer WebSocket connection opened.');
        setStatus('streaming');
        
        const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;
        
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
          }
        };
        
        recorder.start(1000); // Send data every 1 second
      };

      socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'transcript' && data.transcript && onTranscriptionUpdate) {
                onTranscriptionUpdate(data);
            } else if (data.type === 'speaker_id' && data.speaker && onSpeakerIdentified) {
                onSpeakerIdentified(data);
            } else if (data.type === 'ai_insight' && data.insight && onAIInsight) {
                onAIInsight(data);
            }
        } catch (error) {
            console.error("Error processing WebSocket message:", error);
        }
      };

      socket.onclose = () => {
        console.log('AudioStreamer WebSocket connection closed.');
        setStatus('disconnected');
        stopStreaming();
      };
      
      socket.onerror = (err) => {
        console.error('AudioStreamer WebSocket error:', err);
        setError('WebSocket connection error.');
        setStatus('error');
        stopStreaming();
      };

    } catch (err) {
      console.error('Error getting user media or connecting WebSocket:', err);
      setError('Could not get microphone permission or connect to server.');
      setStatus('error');
    }
  }, [onTranscriptionUpdate, onSpeakerIdentified, onAIInsight, stopStreaming]);

  useEffect(() => {
    if (isRecording) {
      startStreaming();
    } else {
      stopStreaming();
    }

    return () => {
      stopStreaming();
    };
  }, [isRecording, startStreaming, stopStreaming]);

  if (error) {
    return <div style={{ color: 'red', padding: '10px' }}>Error: {error}</div>;
  }

  return null;
};

export default AudioStreamer; 