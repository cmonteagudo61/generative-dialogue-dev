import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVideo } from './VideoProvider';
import './AIVideoControls.css';

/**
 * AIVideoControls Component
 * Provides AI-enhanced video controls including:
 * - Smart mute detection
 * - Auto speaker focus
 * - Conversation flow optimization
 * - Background noise suppression
 */
const AIVideoControls = ({ 
  onMuteDetected,
  onSpeakerFocused,
  onControlAction,
  showAdvancedControls = true 
}) => {
  const { callObject, participants, isConnected } = useVideo();
  
  // AI Control States
  const [isMuteDetectionActive, setIsMuteDetectionActive] = useState(false);
  const [isAutoFocusActive, setIsAutoFocusActive] = useState(false);
  const [isNoiseSuppressionActive, setIsNoiseSuppressionActive] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [audioLevels, setAudioLevels] = useState({});
  const [mutedParticipants, setMutedParticipants] = useState(new Set());
  
  // Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [conversationFlow, setConversationFlow] = useState('balanced');
  const [recommendedActions, setRecommendedActions] = useState([]);
  
  // Refs for audio analysis
  const audioAnalysisRef = useRef(null);
  const speakerTimerRef = useRef(null);
  
  /**
   * Detect muted participants using audio level analysis
   */
  const detectMutedParticipants = useCallback(async () => {
    if (!callObject || !isConnected) return;
    
    try {
      const allParticipants = callObject.participants();
      const newMutedParticipants = new Set();
      const newAudioLevels = {};
      
      for (const [participantId, participant] of Object.entries(allParticipants)) {
        const audioTrack = participant.tracks?.audio?.track;
        
        if (audioTrack) {
          // Check if audio track is enabled
          const isAudioEnabled = audioTrack.enabled;
          
          if (!isAudioEnabled) {
            newMutedParticipants.add(participantId);
            newAudioLevels[participantId] = 0;
          } else {
            // Simulate audio level detection (in real implementation, use Web Audio API)
            newAudioLevels[participantId] = Math.random() * 100;
          }
        } else {
          newMutedParticipants.add(participantId);
          newAudioLevels[participantId] = 0;
        }
      }
      
      setMutedParticipants(newMutedParticipants);
      setAudioLevels(newAudioLevels);
      
      // Notify parent of mute detection
      onMuteDetected?.({
        mutedParticipants: Array.from(newMutedParticipants),
        audioLevels: newAudioLevels
      });
      
    } catch (error) {
      console.error('🎤 Error detecting muted participants:', error);
    }
  }, [callObject, isConnected, onMuteDetected]);
  
  /**
   * Identify and focus on active speaker
   */
  const focusOnActiveSpeaker = useCallback(() => {
    if (!audioLevels || Object.keys(audioLevels).length === 0) return;
    
    // Find participant with highest audio level
    let maxLevel = 0;
    let currentActiveSpeaker = null;
    
    Object.entries(audioLevels).forEach(([participantId, level]) => {
      if (level > maxLevel && level > 30) { // Threshold for active speaking
        maxLevel = level;
        currentActiveSpeaker = participantId;
      }
    });
    
    if (currentActiveSpeaker !== activeSpeaker) {
      setActiveSpeaker(currentActiveSpeaker);
      
      // Notify parent component
      onSpeakerFocused?.({
        previousSpeaker: activeSpeaker,
        currentSpeaker: currentActiveSpeaker,
        audioLevel: maxLevel
      });
      
      console.log(`🎯 Active speaker focus: ${currentActiveSpeaker} (level: ${maxLevel})`);
    }
  }, [audioLevels, activeSpeaker, onSpeakerFocused]);
  
  /**
   * Analyze conversation flow and provide recommendations
   */
  const analyzeConversationFlow = useCallback(async () => {
    setIsAnalyzing(true);
    
    try {
      const participantCount = Object.keys(participants).length;
      const activeSpeakers = Object.entries(audioLevels)
        .filter(([_, level]) => level > 30)
        .length;
      
      const mutedCount = mutedParticipants.size;
      const speakingRatio = activeSpeakers / Math.max(participantCount, 1);
      
      let flow = 'balanced';
      let recommendations = [];
      
      if (speakingRatio > 0.7) {
        flow = 'overlapping';
        recommendations.push({
          type: 'reduce_overlap',
          title: 'Too Many Speakers',
          description: 'Consider using "raise hand" or turn-taking features',
          action: 'enable_turn_taking'
        });
      } else if (speakingRatio < 0.2) {
        flow = 'quiet';
        recommendations.push({
          type: 'encourage_participation',
          title: 'Low Participation',
          description: 'Consider prompting quiet participants to share',
          action: 'prompt_participation'
        });
      }
      
      if (mutedCount > participantCount * 0.5) {
        recommendations.push({
          type: 'check_mutes',
          title: 'Many Participants Muted',
          description: 'Check if participants need help with audio setup',
          action: 'check_audio_setup'
        });
      }
      
      setConversationFlow(flow);
      setRecommendedActions(recommendations);
      
    } catch (error) {
      console.error('🧠 Error analyzing conversation flow:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [participants, audioLevels, mutedParticipants]);
  
  /**
   * Toggle mute detection
   */
  const handleToggleMuteDetection = () => {
    setIsMuteDetectionActive(!isMuteDetectionActive);
    onControlAction?.({ type: 'mute_detection', enabled: !isMuteDetectionActive });
  };
  
  /**
   * Toggle auto-focus on speaker
   */
  const handleToggleAutoFocus = () => {
    setIsAutoFocusActive(!isAutoFocusActive);
    onControlAction?.({ type: 'auto_focus', enabled: !isAutoFocusActive });
  };
  
  /**
   * Toggle noise suppression
   */
  const handleToggleNoiseSuppression = () => {
    setIsNoiseSuppressionActive(!isNoiseSuppressionActive);
    onControlAction?.({ type: 'noise_suppression', enabled: !isNoiseSuppressionActive });
  };
  
  /**
   * Execute recommended action
   */
  const executeRecommendedAction = (action) => {
    console.log('🚀 Executing recommended action:', action);
    onControlAction?.({ type: 'recommendation', action });
    
    // Remove executed recommendation
    setRecommendedActions(prev => 
      prev.filter(rec => rec.action !== action.action)
    );
  };
  
  /**
   * Start audio analysis when mute detection is active
   */
  useEffect(() => {
    if (isMuteDetectionActive && isConnected) {
      audioAnalysisRef.current = setInterval(() => {
        detectMutedParticipants();
      }, 1000); // Check every second
    } else {
      if (audioAnalysisRef.current) {
        clearInterval(audioAnalysisRef.current);
        audioAnalysisRef.current = null;
      }
    }
    
    return () => {
      if (audioAnalysisRef.current) {
        clearInterval(audioAnalysisRef.current);
      }
    };
  }, [isMuteDetectionActive, isConnected, detectMutedParticipants]);
  
  /**
   * Auto-focus on speaker when enabled
   */
  useEffect(() => {
    if (isAutoFocusActive) {
      speakerTimerRef.current = setInterval(() => {
        focusOnActiveSpeaker();
      }, 500); // Check every 500ms for responsiveness
    } else {
      if (speakerTimerRef.current) {
        clearInterval(speakerTimerRef.current);
        speakerTimerRef.current = null;
      }
    }
    
    return () => {
      if (speakerTimerRef.current) {
        clearInterval(speakerTimerRef.current);
      }
    };
  }, [isAutoFocusActive, focusOnActiveSpeaker]);
  
  /**
   * Analyze conversation flow periodically
   */
  useEffect(() => {
    const interval = setInterval(analyzeConversationFlow, 5000); // Every 5 seconds
    return () => clearInterval(interval);
  }, [analyzeConversationFlow]);
  
  if (!showAdvancedControls) {
    return null;
  }
  
  return (
    <div className="ai-video-controls">
      <div className="controls-header">
        <h4>🤖 AI Video Controls</h4>
        {isAnalyzing && <span className="analyzing-indicator">Analyzing...</span>}
      </div>
      
      <div className="control-toggles">
        <div className="control-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isMuteDetectionActive}
              onChange={handleToggleMuteDetection}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Mute Detection</span>
          </label>
          <span className="control-status">
            {mutedParticipants.size} muted
          </span>
        </div>
        
        <div className="control-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isAutoFocusActive}
              onChange={handleToggleAutoFocus}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">Auto Speaker Focus</span>
          </label>
          <span className="control-status">
            {activeSpeaker ? `Focused on: ${activeSpeaker.slice(0, 8)}...` : 'No speaker'}
          </span>
        </div>
        
        <div className="control-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={isNoiseSuppressionActive}
              onChange={handleToggleNoiseSuppression}
            />
            <span className="toggle-slider"></span>
            <span className="toggle-text">AI Noise Suppression</span>
          </label>
          <span className="control-status">
            {isNoiseSuppressionActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>
      
      {/* Conversation Flow Analysis */}
      <div className="conversation-analysis">
        <h5>💬 Conversation Flow</h5>
        <div className={`flow-status ${conversationFlow}`}>
          <span className="flow-indicator"></span>
          <span className="flow-text">
            {conversationFlow === 'balanced' && 'Balanced discussion'}
            {conversationFlow === 'overlapping' && 'Too much overlap'}
            {conversationFlow === 'quiet' && 'Low participation'}
          </span>
        </div>
      </div>
      
      {/* AI Recommendations */}
      {recommendedActions.length > 0 && (
        <div className="ai-recommendations">
          <h5>💡 AI Recommendations</h5>
          {recommendedActions.map((recommendation, index) => (
            <div key={index} className="recommendation-item">
              <div className="recommendation-content">
                <strong>{recommendation.title}</strong>
                <p>{recommendation.description}</p>
              </div>
              <button 
                className="execute-btn"
                onClick={() => executeRecommendedAction(recommendation)}
              >
                Apply
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Audio Levels Visualization */}
      {isMuteDetectionActive && (
        <div className="audio-levels">
          <h5>🔊 Audio Levels</h5>
          <div className="levels-grid">
            {Object.entries(audioLevels).map(([participantId, level]) => (
              <div key={participantId} className="level-item">
                <span className="participant-id">
                  {participantId.slice(0, 8)}...
                </span>
                <div className="level-bar">
                  <div 
                    className="level-fill"
                    style={{ 
                      width: `${level}%`,
                      backgroundColor: level > 30 ? '#4CAF50' : '#ccc'
                    }}
                  ></div>
                </div>
                {mutedParticipants.has(participantId) && (
                  <span className="muted-indicator">🔇</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIVideoControls; 