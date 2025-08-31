import React, { useState, useEffect, useCallback } from 'react';
import { useVideo } from './VideoProvider';
import './DialoguePhaseManager.css';

/**
 * DialoguePhaseManager Component
 * Manages video behavior and settings for different dialogue phases
 * Provides phase-specific optimizations for dyad, triad, fishbowl, and community modes
 */
const DialoguePhaseManager = ({ 
  currentPhase, // 'dyad', 'triad', 'quad', 'fishbowl', 'community'
  participantCount,
  onPhaseChange,
  onVideoSettingsChange,
  autoOptimize = true 
}) => {
  const { callObject, participants, isConnected } = useVideo();
  
  // Phase settings state
  const [phaseSettings, setPhaseSettings] = useState({
    layout: 'grid',
    focusMode: 'balanced',
    audioOptimization: 'standard',
    transcriptionMode: 'individual',
    aiProcessing: 'continuous'
  });
  
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [phaseRecommendations, setPhaseRecommendations] = useState([]);
  
  /**
   * Phase-specific optimal settings
   */
  const phaseConfigurations = {
    dyad: {
      layout: 'side-by-side',
      focusMode: 'balanced',
      audioOptimization: 'intimacy',
      transcriptionMode: 'individual',
      aiProcessing: 'dialogue-analysis',
      videoQuality: 'high',
      description: 'Optimized for intimate 1:1 conversations'
    },
    triad: {
      layout: 'triangle',
      focusMode: 'speaker-highlight',
      audioOptimization: 'clarity',
      transcriptionMode: 'group',
      aiProcessing: 'theme-extraction',
      videoQuality: 'high',
      description: 'Enhanced for 3-person collaborative dialogue'
    },
    quad: {
      layout: 'grid-2x2',
      focusMode: 'active-speaker',
      audioOptimization: 'balance',
      transcriptionMode: 'group',
      aiProcessing: 'collective-wisdom',
      videoQuality: 'medium',
      description: 'Balanced for 4-person group discussions'
    },
    fishbowl: {
      layout: 'fishbowl-center',
      focusMode: 'center-stage',
      audioOptimization: 'spotlight',
      transcriptionMode: 'speakers-only',
      aiProcessing: 'catalyst-analysis',
      videoQuality: 'variable',
      description: 'Spotlight on active fishbowl participants'
    },
    community: {
      layout: 'adaptive-grid',
      focusMode: 'community-flow',
      audioOptimization: 'crowd-management',
      transcriptionMode: 'collective',
      aiProcessing: 'emergence-detection',
      videoQuality: 'optimized',
      description: 'Scaled for large group collective intelligence'
    }
  };
  
  /**
   * Apply phase-specific settings
   */
  const applyPhaseSettings = useCallback(async (phase) => {
    if (!phaseConfigurations[phase]) return;
    
    setIsOptimizing(true);
    
    try {
      const config = phaseConfigurations[phase];
      
      // Update phase settings
      setPhaseSettings(config);
      
      // Apply video call optimizations
      if (callObject && isConnected) {
        
        // Set video quality based on phase
        const videoQualitySettings = {
          high: { width: 1280, height: 720, frameRate: 30 },
          medium: { width: 960, height: 540, frameRate: 24 },
          optimized: { width: 640, height: 360, frameRate: 15 },
          variable: 'auto'
        };
        
        const qualitySetting = videoQualitySettings[config.videoQuality];
        
        if (qualitySetting !== 'auto') {
          try {
            await callObject.setLocalVideo(qualitySetting);
          } catch (error) {
            console.warn('🎥 Could not set video quality:', error);
          }
        }
        
        // Apply audio optimizations
        if (config.audioOptimization === 'intimacy') {
          // Higher sensitivity for quiet conversations
          await callObject.setLocalAudio({ 
            AGC: true, 
            echoCancellation: true,
            noiseSuppression: false // Preserve natural conversation sounds
          });
        } else if (config.audioOptimization === 'crowd-management') {
          // Strong noise suppression for large groups
          await callObject.setLocalAudio({
            AGC: true,
            echoCancellation: true,
            noiseSuppression: true
          });
        }
      }
      
      // Notify parent component of settings change
      onVideoSettingsChange?.({
        phase,
        settings: config,
        appliedAt: Date.now()
      });
      
      console.log(`🎭 Applied ${phase} phase settings:`, config);
      
    } catch (error) {
      console.error('❌ Error applying phase settings:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [callObject, isConnected, onVideoSettingsChange]);
  
  /**
   * Analyze current context and recommend phase changes
   */
  const analyzePhaseOptimization = useCallback(() => {
    const recommendations = [];
    const currentConfig = phaseConfigurations[currentPhase];
    
    // Check participant count vs. current phase
    if (currentPhase === 'community' && participantCount < 6) {
      recommendations.push({
        type: 'downsize',
        title: 'Consider Smaller Group Format',
        description: `With ${participantCount} participants, a ${participantCount <= 2 ? 'dyad' : participantCount === 3 ? 'triad' : 'quad'} format might be more intimate`,
        suggestedPhase: participantCount <= 2 ? 'dyad' : participantCount === 3 ? 'triad' : 'quad'
      });
    }
    
    if (currentPhase === 'dyad' && participantCount > 3) {
      recommendations.push({
        type: 'upsize',
        title: 'Scale to Group Format',
        description: `With ${participantCount} participants, consider ${participantCount <= 4 ? 'quad' : participantCount <= 8 ? 'fishbowl' : 'community'} format`,
        suggestedPhase: participantCount <= 4 ? 'quad' : participantCount <= 8 ? 'fishbowl' : 'community'
      });
    }
    
    // Check for optimal transitions
    if (currentPhase === 'triad' && participantCount >= 6) {
      recommendations.push({
        type: 'transition',
        title: 'Fishbowl Opportunity',
        description: 'Perfect size for fishbowl dialogue with rotating speakers',
        suggestedPhase: 'fishbowl'
      });
    }
    
    setPhaseRecommendations(recommendations);
  }, [currentPhase, participantCount]);
  
  /**
   * Execute phase transition
   */
  const executePhaseTransition = async (newPhase) => {
    console.log(`🔄 Transitioning from ${currentPhase} to ${newPhase}`);
    
    await applyPhaseSettings(newPhase);
    onPhaseChange?.(newPhase);
    
    // Clear applied recommendations
    setPhaseRecommendations(prev => 
      prev.filter(rec => rec.suggestedPhase !== newPhase)
    );
  };
  
  /**
   * Auto-apply phase settings when phase changes
   */
  useEffect(() => {
    if (currentPhase && autoOptimize) {
      applyPhaseSettings(currentPhase);
    }
  }, [currentPhase, autoOptimize, applyPhaseSettings]);
  
  /**
   * Analyze optimization opportunities
   */
  useEffect(() => {
    // DISABLED: Potential cause of dashboard flashing
    // const interval = setInterval(analyzePhaseOptimization, 10000); // Every 10 seconds
    // return () => clearInterval(interval);
  }, [analyzePhaseOptimization]);
  
  /**
   * Get phase-specific guidance
   */
  const getPhaseGuidance = (phase) => {
    const guidance = {
      dyad: [
        "Maintain eye contact and natural conversation flow",
        "Use the full screen for intimate dialogue",
        "AI focuses on dialogue patterns and themes"
      ],
      triad: [
        "Allow natural turn-taking between all participants", 
        "Triangle seating promotes equal participation",
        "AI tracks theme emergence and convergence"
      ],
      quad: [
        "Structured discussion with clear facilitator role",
        "Grid layout ensures equal visual presence",
        "AI analyzes collective wisdom patterns"
      ],
      fishbowl: [
        "Central speakers take the spotlight",
        "Outer circle observes and prepares to rotate in",
        "AI focuses on catalyst effectiveness"
      ],
      community: [
        "Large group collective intelligence emergence",
        "Dynamic video grid adapts to participation",
        "AI detects community patterns and insights"
      ]
    };
    
    return guidance[phase] || [];
  };
  
  return (
    <div className="dialogue-phase-manager">
      <div className="phase-header">
        <h4>🎭 Dialogue Phase: {currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1)}</h4>
        {isOptimizing && <span className="optimizing-indicator">Optimizing...</span>}
      </div>
      
      {/* Current Phase Info */}
      <div className="current-phase-info">
        <p className="phase-description">
          {phaseConfigurations[currentPhase]?.description}
        </p>
        <div className="phase-participants">
          <span className="participant-count">{participantCount} participants</span>
          <span className="optimal-range">
            Optimal for {currentPhase === 'dyad' ? '2' : 
                        currentPhase === 'triad' ? '3' : 
                        currentPhase === 'quad' ? '4' : 
                        currentPhase === 'fishbowl' ? '6-8' : '8+'} people
          </span>
        </div>
      </div>
      
      {/* Phase Settings Display */}
      <div className="phase-settings">
        <h5>📊 Active Settings</h5>
        <div className="settings-grid">
          <div className="setting-item">
            <span className="setting-label">Layout:</span>
            <span className="setting-value">{phaseSettings.layout}</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Focus:</span>
            <span className="setting-value">{phaseSettings.focusMode}</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">Audio:</span>
            <span className="setting-value">{phaseSettings.audioOptimization}</span>
          </div>
          <div className="setting-item">
            <span className="setting-label">AI Mode:</span>
            <span className="setting-value">{phaseSettings.aiProcessing}</span>
          </div>
        </div>
      </div>
      
      {/* Phase Guidance */}
      <div className="phase-guidance">
        <h5>💡 Best Practices</h5>
        <ul className="guidance-list">
          {getPhaseGuidance(currentPhase).map((tip, index) => (
            <li key={index} className="guidance-item">{tip}</li>
          ))}
        </ul>
      </div>
      
      {/* Phase Recommendations */}
      {phaseRecommendations.length > 0 && (
        <div className="phase-recommendations">
          <h5>🔄 Optimization Suggestions</h5>
          {phaseRecommendations.map((recommendation, index) => (
            <div key={index} className="recommendation-card">
              <div className="recommendation-content">
                <strong>{recommendation.title}</strong>
                <p>{recommendation.description}</p>
              </div>
              <button 
                className="transition-btn"
                onClick={() => executePhaseTransition(recommendation.suggestedPhase)}
              >
                Switch to {recommendation.suggestedPhase}
              </button>
            </div>
          ))}
        </div>
      )}
      
      {/* Manual Phase Selector */}
      <div className="phase-selector">
        <h5>🎯 Manual Phase Selection</h5>
        <div className="phase-buttons">
          {Object.keys(phaseConfigurations).map((phase) => (
            <button
              key={phase}
              className={`phase-btn ${phase === currentPhase ? 'active' : ''}`}
              onClick={() => executePhaseTransition(phase)}
              disabled={phase === currentPhase}
            >
              {phase.charAt(0).toUpperCase() + phase.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DialoguePhaseManager; 