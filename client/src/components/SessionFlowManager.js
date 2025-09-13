import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import SessionTimer from './SessionTimer';
import FacilitatorGuidance from './FacilitatorGuidance';
import QuickDialogueSetup from './QuickDialogueSetup';
import './SessionFlowManager.css';

const SessionFlowManager = ({
  isHost = false,
  participantCount = 0,
  onPhaseChange = () => {},
  onCreateBreakoutRooms = () => {},
  onTimerComplete = () => {},
  autoAdvance = false,
  customPhaseConfig = null,
  isVisible = true,
  currentPhase = null,
  currentSubstage = null
}) => {
  // Define the standard dialogue flow
  const basePhaseConfig = useMemo(() => ({
    'Connect': {
      order: 1,
      totalDuration: 50 * 60, // 50 minutes
      color: '#667eea',
      description: 'Build initial connections and trust',
      substages: {
        'Catalyst': {
          duration: 10 * 60, // 10 minutes
          roomType: 'community',
          description: 'Centering practice and intention setting',
          catalystOptions: ['meditation', 'reading', 'music', 'video', 'art', 'question', 'fishbowl', 'movement'],
          defaultCatalyst: 'meditation'
        },
        'Dialogue': {
          duration: 20 * 60, // 20 minutes
          roomType: 'configurable', // Will be set by host
          description: 'Intimate sharing and connection',
          roomOptions: ['dyad', 'triad', 'quad', 'kiva'],
          defaultRoomType: 'dyad',
          suggestedRoomType: 'dyad' // For initial connections
        },
        'Summary': {
          duration: 5 * 60, // 5 minutes
          roomType: 'inherit_from_dialogue', // Will inherit from Dialogue substage
          description: 'Harvest insights from breakout conversations'
        },
        'WE': {
          duration: 15 * 60, // 15 minutes
          roomType: 'community',
          description: 'Build collective understanding'
        }
      }
    },
    'Explore': {
      order: 2,
      totalDuration: 55 * 60, // 55 minutes
      color: '#764ba2',
      description: 'Deepen inquiry and expand perspectives',
      substages: {
        'Catalyst': {
          duration: 10 * 60,
          roomType: 'community',
          description: 'Thought-provoking catalyst for exploration',
          catalystOptions: ['meditation', 'reading', 'music', 'video', 'art', 'question', 'fishbowl', 'movement'],
          defaultCatalyst: 'reading'
        },
        'Dialogue': {
          duration: 25 * 60, // 25 minutes
          roomType: 'configurable',
          description: 'Deeper exploration and inquiry',
          roomOptions: ['dyad', 'triad', 'quad', 'kiva'],
          defaultRoomType: 'triad',
          suggestedRoomType: 'triad' // For richer perspectives
        },
        'Summary': {
          duration: 5 * 60,
          roomType: 'inherit_from_dialogue', // Will inherit from Dialogue substage
          description: 'Share discoveries and questions'
        },
        'WE': {
          duration: 15 * 60,
          roomType: 'community',
          description: 'Synthesize collective learning'
        }
      }
    },
    'Discover': {
      order: 3,
      totalDuration: 60 * 60, // 60 minutes
      color: '#f093fb',
      description: 'Breakthrough insights and deeper wisdom',
      substages: {
        'Catalyst': {
          duration: 15 * 60, // 15 minutes
          roomType: 'community',
          description: 'Powerful catalyst for breakthrough',
          catalystOptions: ['meditation', 'reading', 'music', 'video', 'art', 'question', 'fishbowl', 'movement'],
          defaultCatalyst: 'fishbowl'
        },
        'Dialogue': {
          duration: 25 * 60,
          roomType: 'configurable',
          description: 'Deep sharing and wisdom emergence',
          roomOptions: ['dyad', 'triad', 'quad', 'kiva'],
          defaultRoomType: 'kiva',
          suggestedRoomType: 'kiva' // For wisdom circles
        },
        'Summary': {
          duration: 5 * 60,
          roomType: 'inherit_from_dialogue', // Will inherit from Dialogue substage
          description: 'Honor depth of sharing'
        },
        'WE': {
          duration: 15 * 60,
          roomType: 'community',
          description: 'Recognize collective wisdom'
        }
      }
    },
    'Closing': {
      order: 4,
      totalDuration: 15 * 60, // 15 minutes
      color: '#00b894',
      description: 'Complete the dialogue session and prepare for individual harvest',
      substages: {
        'Closing': {
          duration: 15 * 60,
          roomType: 'community',
          description: 'General comments, harvest instructions, and housekeeping'
        }
      }
    }
  }), []);

  // Session state - use props if provided, otherwise default
  const [internalCurrentPhase, setInternalCurrentPhase] = useState('Connect');
  const [internalCurrentSubstage, setInternalCurrentSubstage] = useState('Catalyst');
  
  // Time-first approach: total available time
  // Calculate from customPhaseConfig if provided, otherwise default to 180 minutes
  const calculateTotalTimeFromConfig = useCallback((config) => {
    console.log('🕐 Calculating total time from config:', config);
    if (!config) {
      console.log('🕐 No config provided, defaulting to 180 minutes');
      return 180; // Default 3 hours
    }
    
    const totalSeconds = Object.values(config).reduce((total, phase) => {
      console.log(`🕐 Phase duration: ${phase.totalDuration || 0} seconds`);
      return total + (phase.totalDuration || 0);
    }, 0);
    
    const totalMinutes = Math.round(totalSeconds / 60);
    console.log(`🕐 Total calculated: ${totalSeconds} seconds = ${totalMinutes} minutes`);
    return totalMinutes; // Convert to minutes
  }, []);
  
  const [totalAvailableTime, setTotalAvailableTime] = useState(() => 
    calculateTotalTimeFromConfig(customPhaseConfig)
  );
  const [showTimeConfig, setShowTimeConfig] = useState(false);
  
  // Track if we've initialized from customPhaseConfig to prevent overriding user changes
  const hasInitializedFromConfig = useRef(false);
  
  // Update totalAvailableTime when customPhaseConfig changes (only on initial load)
  useEffect(() => {
    if (customPhaseConfig && !hasInitializedFromConfig.current) {
      const newTotalTime = calculateTotalTimeFromConfig(customPhaseConfig);
      setTotalAvailableTime(newTotalTime);
      hasInitializedFromConfig.current = true;
      console.log(`🕐 Initialized total available time from config: ${newTotalTime} minutes`);
    }
  }, [customPhaseConfig, calculateTotalTimeFromConfig]);
  
  // Dynamic phase configuration that can be updated by recommendations
  const [dynamicPhaseConfig, setDynamicPhaseConfig] = useState(null);
  
  // Visual feedback states
  const [isApplyingConfig, setIsApplyingConfig] = useState(false);
  const [configApplied, setConfigApplied] = useState(false);
  const [animatePhaseCards, setAnimatePhaseCards] = useState(false);

  const phaseConfig = customPhaseConfig || dynamicPhaseConfig || basePhaseConfig;
  
  // Auto-configure based on available time - matching Quick Setup configurations
  const getRecommendedConfiguration = useCallback((totalMinutes) => {
    // Based on dialogue methodology best practices - matching Quick Setup
    if (totalMinutes <= 60) {
      // 60 minutes: Very compressed (suboptimal)
      return {
        connect: { duration: 15, roomType: 'dyad' },
        explore: { duration: 20, roomType: 'dyad' },
        discover: { duration: 20, roomType: 'dyad' },
        closing: { duration: 5 }
      };
    } else if (totalMinutes <= 90) {
      // 90 minutes: Minimal viable dialogue
      return {
        connect: { duration: 25, roomType: 'dyad' },
        explore: { duration: 30, roomType: 'dyad' },
        discover: { duration: 30, roomType: 'triad' },
        closing: { duration: 5 }
      };
    } else if (totalMinutes <= 120) {
      // 2 hours: Solid dialogue
      return {
        connect: { duration: 35, roomType: 'dyad' },
        explore: { duration: 40, roomType: 'triad' },
        discover: { duration: 40, roomType: 'triad' },
        closing: { duration: 5 }
      };
    } else if (totalMinutes <= 180) {
      // 3 hours: Full dialogue experience
      return {
        connect: { duration: 45, roomType: 'dyad' },
        explore: { duration: 60, roomType: 'triad' },
        discover: { duration: 60, roomType: 'quad' },
        closing: { duration: 15 }
      };
    } else if (totalMinutes <= 240) {
      // 4 hours: Extended dialogue
      return {
        connect: { duration: 60, roomType: 'dyad' },
        explore: { duration: 75, roomType: 'triad' },
        discover: { duration: 90, roomType: 'quad' },
        closing: { duration: 15 }
      };
    } else {
      // 6+ hours: Deep exploration
      return {
        connect: { duration: 90, roomType: 'dyad' },
        explore: { duration: 120, roomType: 'triad' },
        discover: { duration: 135, roomType: 'kiva' },
        closing: { duration: 15 }
      };
    }
  }, []);
  
  // Apply recommended configuration when time changes
  const applyRecommendedConfiguration = useCallback(async () => {
    // Start visual feedback
    setIsApplyingConfig(true);
    setConfigApplied(false);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const recommended = getRecommendedConfiguration(totalAvailableTime);
    const newConfigurations = {};
    
    // Apply to each phase with proper substage time allocation
    Object.entries(recommended).forEach(([phase, config]) => {
      if (phase !== 'closing') {
        const phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);
        const phaseDurationMinutes = config.duration;
        
        // Calculate substage durations that add up to phase total
        // Standard allocation: Catalyst 20%, Dialogue 60%, Summary 15%, WE 5%
        const catalystDuration = Math.round(phaseDurationMinutes * 0.2);
        const dialogueDuration = Math.round(phaseDurationMinutes * 0.6);
        const summaryDuration = Math.round(phaseDurationMinutes * 0.15);
        const weDuration = phaseDurationMinutes - catalystDuration - dialogueDuration - summaryDuration; // Remainder to ensure exact total
        
        // Configure each substage
        newConfigurations[`${phaseName}_Catalyst`] = {
          catalystType: 'meditation', // Default catalyst
          duration: catalystDuration * 60 // Convert to seconds
        };
        newConfigurations[`${phaseName}_Dialogue`] = {
          roomType: config.roomType,
          duration: dialogueDuration * 60 // Convert to seconds
        };
        newConfigurations[`${phaseName}_Summary`] = {
          roomType: config.roomType, // Inherit from dialogue
          duration: summaryDuration * 60 // Convert to seconds
        };
        newConfigurations[`${phaseName}_WE`] = {
          duration: weDuration * 60 // Convert to seconds
        };
        
        // Also update the phase total duration configuration
        newConfigurations[`${phaseName}_PhaseTotal`] = {
          totalDuration: phaseDurationMinutes * 60 // Convert to seconds
        };
        
        console.log(`📊 ${phaseName} phase (${phaseDurationMinutes}m total):`, {
          catalyst: `${catalystDuration}m`,
          dialogue: `${dialogueDuration}m`,
          summary: `${summaryDuration}m`,
          we: `${weDuration}m`,
          total: `${catalystDuration + dialogueDuration + summaryDuration + weDuration}m`
        });
      } else {
        // Configure closing
        newConfigurations['Closing_Closing'] = {
          duration: config.duration * 60
        };
      }
    });
    
    setPhaseConfigurations(newConfigurations);
    
    // Update the dynamic phase config with new totals
    setDynamicPhaseConfig(prevConfig => {
      const updatedConfig = { ...(prevConfig || basePhaseConfig) };
      Object.entries(recommended).forEach(([phase, config]) => {
        if (phase !== 'closing') {
          const phaseName = phase.charAt(0).toUpperCase() + phase.slice(1);
          if (updatedConfig[phaseName]) {
            updatedConfig[phaseName] = {
              ...updatedConfig[phaseName],
              totalDuration: config.duration * 60 // Update the phase total
            };
          }
        }
      });
      return updatedConfig;
    });
    
    // Trigger phase card animation
    setAnimatePhaseCards(true);
    setTimeout(() => setAnimatePhaseCards(false), 1000);
    
    // Show success feedback
    setIsApplyingConfig(false);
    setConfigApplied(true);
    
    // Hide success message after 3 seconds
    setTimeout(() => setConfigApplied(false), 3000);
    
    console.log('🎯 Applied recommended configuration with proper time allocation and phase totals');
  }, [totalAvailableTime, getRecommendedConfiguration, basePhaseConfig]);
  
  // Use external current phase/substage if provided, otherwise use internal state
  // Convert received phase names to proper case for SessionFlowManager
  const normalizePhase = (phase) => {
    if (!phase) return phase;
    const phaseMap = {
      'connect': 'Connect',
      'explore': 'Explore', 
      'discover': 'Discover',
      'closing': 'Closing'
    };
    return phaseMap[phase.toLowerCase()] || phase;
  };
  
  const activeCurrentPhase = normalizePhase(currentPhase) || internalCurrentPhase;
  const activeCurrentSubstage = currentSubstage || internalCurrentSubstage;
  
  // DISABLED: Debug phase normalization - causing infinite render loop
  // console.log('📋 SessionFlowManager:', {
  //   received: currentPhase,
  //   normalized: activeCurrentPhase,
  //   substage: activeCurrentSubstage
  // });
  const [isSessionActive, setIsSessionActive] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [sessionStartTime, setSessionStartTime] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [phaseStartTime, setPhaseStartTime] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [substageStartTime, setSubstageStartTime] = useState(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);
  const [completedPhases, setCompletedPhases] = useState([]);
  const [sessionNotes, setSessionNotes] = useState('');
  const [phaseConfigurations, setPhaseConfigurations] = useState({});
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configPhase, setConfigPhase] = useState(null);
  const [configSubstage, setConfigSubstage] = useState(null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  const [quickSetupContext, setQuickSetupContext] = useState(null);
  
  // Auto-apply recommended configuration on initial load
  React.useEffect(() => {
    // Only auto-apply if no custom configurations exist
    if (Object.keys(phaseConfigurations).length === 0) {
      applyRecommendedConfiguration();
    }
  }, [applyRecommendedConfiguration, phaseConfigurations]);

  // Get current phase and substage config
  const currentPhaseConfig = phaseConfig[activeCurrentPhase];
  const currentSubstageConfig = currentPhaseConfig?.substages[activeCurrentSubstage];
  const currentDuration = currentSubstageConfig?.duration || 0;

  // Calculate session progress
  const sessionProgress = useMemo(() => {
    const phases = Object.keys(phaseConfig);
    const currentPhaseIndex = phases.indexOf(activeCurrentPhase);
    const totalPhases = phases.length;
    
    if (currentPhaseIndex === -1) return 0;
    
    const substages = Object.keys(currentPhaseConfig?.substages || {});
    const currentSubstageIndex = substages.indexOf(activeCurrentSubstage);
    const totalSubstages = substages.length;
    
    const phaseProgress = totalSubstages > 0 ? (currentSubstageIndex + 1) / totalSubstages : 1;
    const overallProgress = (currentPhaseIndex + phaseProgress) / totalPhases;
    
    return Math.round(overallProgress * 100);
  }, [activeCurrentPhase, activeCurrentSubstage, phaseConfig, currentPhaseConfig]);

  // Start session
  const handleStartSession = useCallback(() => {
    const now = Date.now();
    setIsSessionActive(true);
    setSessionStartTime(now);
    setPhaseStartTime(now);
    setSubstageStartTime(now);
    setIsTimerRunning(true);
    
    // Create initial breakout rooms based on first substage
    const firstSubstage = currentSubstageConfig;
    if (firstSubstage && firstSubstage.roomType !== 'community') {
      onCreateBreakoutRooms(firstSubstage.roomType, participantCount);
    }
    
    onPhaseChange(currentPhase, currentSubstage, firstSubstage);
  }, [activeCurrentPhase, activeCurrentSubstage, currentSubstageConfig, onPhaseChange, onCreateBreakoutRooms, participantCount]);

  // Pause/Resume session
  const handlePauseResume = useCallback(() => {
    setIsTimerRunning(!isTimerRunning);
  }, [isTimerRunning]);

  // Advance to next substage or phase
  const handleAdvanceSubstage = useCallback(() => {
    const substages = Object.keys(currentPhaseConfig?.substages || {});
    const currentSubstageIndex = substages.indexOf(activeCurrentSubstage);
    
    if (currentSubstageIndex < substages.length - 1) {
      // Move to next substage
      const nextSubstage = substages[currentSubstageIndex + 1];
      // Only update internal state if not controlled externally
      if (!currentPhase && !currentSubstage) {
        setInternalCurrentSubstage(nextSubstage);
      }
      setSubstageStartTime(Date.now());
      
      const nextSubstageConfig = currentPhaseConfig.substages[nextSubstage];
      
      // Create appropriate breakout rooms
      if (nextSubstageConfig.roomType !== 'community') {
        onCreateBreakoutRooms(nextSubstageConfig.roomType, participantCount);
      }
      
      onPhaseChange(currentPhase, nextSubstage, nextSubstageConfig);
    } else {
      // Move to next phase
      handleAdvancePhase();
    }
  }, [activeCurrentPhase, activeCurrentSubstage, currentPhaseConfig, onPhaseChange, onCreateBreakoutRooms, participantCount]);

  // Advance to next phase
  const handleAdvancePhase = useCallback(() => {
    const phases = Object.keys(phaseConfig);
    const currentPhaseIndex = phases.indexOf(activeCurrentPhase);
    
    if (currentPhaseIndex < phases.length - 1) {
      const nextPhase = phases[currentPhaseIndex + 1];
      const nextPhaseConfig = phaseConfig[nextPhase];
      const firstSubstage = Object.keys(nextPhaseConfig.substages)[0];
      
      setCompletedPhases(prev => [...prev, activeCurrentPhase]);
      // Only update internal state if not controlled externally
      if (!currentPhase && !currentSubstage) {
        setInternalCurrentPhase(nextPhase);
        setInternalCurrentSubstage(firstSubstage);
      }
      setPhaseStartTime(Date.now());
      setSubstageStartTime(Date.now());
      
      const firstSubstageConfig = nextPhaseConfig.substages[firstSubstage];
      
      // Create appropriate breakout rooms
      if (firstSubstageConfig.roomType !== 'community') {
        onCreateBreakoutRooms(firstSubstageConfig.roomType, participantCount);
      }
      
      onPhaseChange(nextPhase, firstSubstage, firstSubstageConfig);
    } else {
      // Session complete
      setIsSessionActive(false);
      setIsTimerRunning(false);
      setCompletedPhases(prev => [...prev, currentPhase]);
      onTimerComplete();
    }
  }, [currentPhase, phaseConfig, onPhaseChange, onCreateBreakoutRooms, participantCount, onTimerComplete]);

  // Handle timer completion
  const handleTimerComplete = useCallback(() => {
    if (autoAdvance) {
      handleAdvanceSubstage();
    } else {
      setIsTimerRunning(false);
    }
  }, [autoAdvance, handleAdvanceSubstage]);

  // Jump to specific phase/substage
  const handleJumpTo = useCallback((phase, substage) => {
    // Only update internal state if not controlled externally
    if (!currentPhase && !currentSubstage) {
      setInternalCurrentPhase(phase);
      setInternalCurrentSubstage(substage);
    }
    setPhaseStartTime(Date.now());
    setSubstageStartTime(Date.now());
    
    const selectedPhaseConfig = phaseConfig[phase];
    const substageConfig = selectedPhaseConfig?.substages[substage];
    
    // Use configured room type if available, otherwise use default
    const configKey = `${phase}_${substage}`;
    const configuredRoomType = phaseConfigurations[configKey]?.roomType || substageConfig?.defaultRoomType || substageConfig?.roomType;
    
    if (configuredRoomType !== 'community' && configuredRoomType !== 'configurable') {
      onCreateBreakoutRooms(configuredRoomType, participantCount);
    }
    
    onPhaseChange(phase, substage, { ...substageConfig, roomType: configuredRoomType });
  }, [phaseConfig, phaseConfigurations, onPhaseChange, onCreateBreakoutRooms, participantCount]);

  // Configure phase/substage options
  const handleConfigurePhase = useCallback((phase, substage) => {
    setConfigPhase(phase);
    setConfigSubstage(substage);
    setShowConfigModal(true);
  }, []);

  // Save phase configuration
  const handleSaveConfiguration = useCallback((config) => {
    const configKey = `${configPhase}_${configSubstage}`;
    setPhaseConfigurations(prev => ({
      ...prev,
      [configKey]: {
        ...config,
        isUserConfigured: true // Mark as user-configured
      }
    }));
    setShowConfigModal(false);
    setConfigPhase(null);
    setConfigSubstage(null);
  }, [configPhase, configSubstage]);

  // Quick Setup integration handlers
  const handleLaunchQuickSetup = useCallback((roomType, phase, substage) => {
    const context = {
      participantCount,
      suggestedRoomType: roomType,
      phase,
      substage,
      currentPhaseConfig: phaseConfig[phase],
      currentSubstageConfig: phaseConfig[phase]?.substages[substage]
    };
    
    setQuickSetupContext(context);
    setShowQuickSetup(true);
    setShowConfigModal(false); // Close config modal
  }, [participantCount, phaseConfig]);

  const handleQuickSetupComplete = useCallback((dialogueConfig) => {
    console.log('🎯 Quick Setup completed from Session Flow:', dialogueConfig);
    
    // Apply the Quick Setup configuration to the current phase/substage
    if (quickSetupContext) {
      const { phase, substage } = quickSetupContext;
      const configKey = `${phase}_${substage}`;
      
      // Extract room configuration from Quick Setup
      const roomConfig = {
        roomType: dialogueConfig.configuration.phases.connect.roomType, // Use the room type from Quick Setup
        duration: dialogueConfig.configuration.phases.connect.duration * 60, // Convert to seconds
        quickSetupGenerated: true
      };
      
      setPhaseConfigurations(prev => ({
        ...prev,
        [configKey]: roomConfig
      }));
      
      // Trigger room creation
      onCreateBreakoutRooms(roomConfig.roomType, participantCount);
    }
    
    setShowQuickSetup(false);
    setQuickSetupContext(null);
  }, [quickSetupContext, onCreateBreakoutRooms, participantCount]);

  // Get effective configuration for a phase/substage
  const getEffectiveConfig = useCallback((phase, substage) => {
    const configKey = `${phase}_${substage}`;
    const baseConfig = phaseConfig[phase]?.substages[substage];
    const customConfig = phaseConfigurations[configKey];
    
    let effectiveRoomType = customConfig?.roomType || baseConfig?.defaultRoomType || baseConfig?.roomType;
    
    // Handle inheritance from Dialogue substage for Summary
    if (baseConfig?.roomType === 'inherit_from_dialogue' && substage === 'Summary') {
      // Get the dialogue config directly to avoid recursion
      const dialogueConfigKey = `${phase}_Dialogue`;
      const dialogueBaseConfig = phaseConfig[phase]?.substages['Dialogue'];
      const dialogueCustomConfig = phaseConfigurations[dialogueConfigKey];
      effectiveRoomType = dialogueCustomConfig?.roomType || dialogueBaseConfig?.defaultRoomType || dialogueBaseConfig?.roomType;
    }
    
    return {
      ...baseConfig,
      ...customConfig,
      roomType: effectiveRoomType,
      catalystType: customConfig?.catalystType || baseConfig?.defaultCatalyst
    };
  }, [phaseConfig, phaseConfigurations]);

  if (!isVisible) return null;

  return (
    <div className="session-flow-manager">
      <div className="session-header">
        <div className="session-title">
          <h2>Dialogue Session Flow</h2>
          
          {/* Time-First Configuration */}
          <div className="time-first-config">
            <div className="time-display">
              <span className="time-label">Total Available Time:</span>
              <button 
                className="time-value-btn"
                onClick={() => setShowTimeConfig(!showTimeConfig)}
              >
                {Math.floor(totalAvailableTime / 60)}h {totalAvailableTime % 60}m ⚙️
              </button>
            </div>
            
            {showTimeConfig && (
              <div className="time-config-panel">
                <label>Available Time (minutes):</label>
                <input
                  type="number"
                  value={totalAvailableTime}
                  onChange={(e) => setTotalAvailableTime(parseInt(e.target.value) || 180)}
                  min="30"
                  max="480"
                  step="15"
                  className="time-input"
                />
                <div className="time-presets">
                  <button onClick={() => setTotalAvailableTime(60)}>60min</button>
                  <button onClick={() => setTotalAvailableTime(90)}>90min</button>
                  <button onClick={() => setTotalAvailableTime(120)}>2h</button>
                  <button onClick={() => setTotalAvailableTime(180)}>3h</button>
                  <button onClick={() => setTotalAvailableTime(240)}>4h</button>
                  <button onClick={() => setTotalAvailableTime(360)}>6h</button>
                </div>
                
                <div className="recommended-config">
                  <button 
                    className={`apply-recommended-btn ${isApplyingConfig ? 'loading' : ''} ${configApplied ? 'success' : ''}`}
                    onClick={applyRecommendedConfiguration}
                    disabled={isApplyingConfig}
                  >
                    {isApplyingConfig ? (
                      <>⏳ Applying Configuration...</>
                    ) : configApplied ? (
                      <>✅ Configuration Applied!</>
                    ) : (
                      <>🎯 Apply Recommended Configuration</>
                    )}
                  </button>
                  <p className="recommendation-preview">
                    {(() => {
                      const rec = getRecommendedConfiguration(totalAvailableTime);
                      return `Connect: ${rec.connect.roomType}s (${rec.connect.duration}m) → Explore: ${rec.explore.roomType}s (${rec.explore.duration}m) → Discover: ${rec.discover.roomType}s (${rec.discover.duration}m)`;
                    })()}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="session-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ 
                  width: `${sessionProgress}%`,
                  backgroundColor: currentPhaseConfig?.color || '#667eea'
                }}
              />
            </div>
            <span className="progress-text">{sessionProgress}% Complete</span>
          </div>
        </div>
        
        {isHost && (
          <div className="session-controls">
            {!isSessionActive ? (
              <button 
                className="session-btn start-session"
                onClick={handleStartSession}
              >
                🚀 Start Session
              </button>
            ) : (
              <>
                <button 
                  className={`session-btn ${isTimerRunning ? 'pause' : 'resume'}`}
                  onClick={handlePauseResume}
                >
                  {isTimerRunning ? '⏸️ Pause' : '▶️ Resume'}
                </button>
                <button 
                  className="session-btn advance"
                  onClick={handleAdvanceSubstage}
                >
                  ⏭️ Next
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {isSessionActive && (
        <>
          <div className="current-phase-info">
            <div className="phase-display">
              <div 
                className="phase-indicator"
                style={{ backgroundColor: currentPhaseConfig?.color }}
              >
                <span className="phase-name">{activeCurrentPhase}</span>
                <span className="substage-name">{activeCurrentSubstage}</span>
              </div>
              <div className="phase-description">
                {currentSubstageConfig?.description || currentPhaseConfig?.description}
              </div>
            </div>
            
            <SessionTimer
              duration={currentDuration}
              isRunning={isTimerRunning}
              onComplete={handleTimerComplete}
              phase={currentPhase}
              subphase={currentSubstage}
              autoAdvance={autoAdvance}
              onPhaseAdvance={handleAdvanceSubstage}
            />
          </div>

          {showGuidance && (
            <FacilitatorGuidance
              phase={currentPhase}
              subphase={currentSubstage}
              timeRemaining={currentDuration}
              participantCount={participantCount}
              roomType={currentSubstageConfig?.roomType}
              isVisible={showGuidance}
              onDismiss={() => setShowGuidance(false)}
            />
          )}
        </>
      )}

      {isHost && (
        <div className="phase-navigator">
          <h3>Session Overview</h3>
          <div className="phase-grid">
            {Object.entries(phaseConfig).map(([phaseName, phase]) => (
              <div 
                key={phaseName}
                className={`phase-card ${phaseName === activeCurrentPhase ? 'current' : ''} ${completedPhases.includes(phaseName) ? 'completed' : ''} ${animatePhaseCards ? 'config-updated' : ''}`}
                style={{ borderColor: phase.color }}
              >
                <div className="phase-card-header">
                  <h4>{phaseName}</h4>
                  <span className="phase-duration">
                    {Math.round(phase.totalDuration / 60)}min
                  </span>
                </div>
                <p className="phase-card-description">{phase.description}</p>
                
                <div className="substage-list">
                  {Object.entries(phase.substages).map(([substageName, substage]) => {
                    const effectiveConfig = getEffectiveConfig(phaseName, substageName);
                    const isConfigurable = substage.roomType === 'configurable' || substage.catalystOptions;
                    const configKey = `${phaseName}_${substageName}`;
                    
                    // Only consider it configured if there's a meaningful difference from defaults
                    const customConfig = phaseConfigurations[configKey];
                    
                    // Check if this is actually configured (not just auto-applied defaults)
                    const isConfigured = customConfig && customConfig.isUserConfigured === true;
                    
                    return (
                      <div key={substageName} className="substage-container">
                        <button
                          className={`substage-btn ${phaseName === activeCurrentPhase && substageName === activeCurrentSubstage ? 'current' : ''}`}
                          onClick={() => handleJumpTo(phaseName, substageName)}
                          disabled={!isSessionActive}
                        >
                          <span className="substage-name">{substageName}</span>
                          <span className="substage-duration">{Math.round((effectiveConfig.duration || substage.duration) / 60)}m</span>
                          {/* Show room type for non-catalyst substages, or show catalyst type for catalyst substages */}
                          {effectiveConfig.catalystType ? (
                            <span className="substage-catalyst">{effectiveConfig.catalystType}</span>
                          ) : (
                            <span className="substage-room-type">
                              {effectiveConfig.roomType === 'configurable' ? 
                                effectiveConfig.suggestedRoomType || 'TBD' : 
                                effectiveConfig.roomType}
                            </span>
                          )}
                        </button>
                        {isHost && isConfigurable && (
                          <button
                            className={`config-btn ${isConfigured ? 'configured' : ''}`}
                            onClick={() => handleConfigurePhase(phaseName, substageName)}
                            title={`Configure ${substageName}`}
                          >
                            ⚙️
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isHost && isSessionActive && (
        <div className="session-notes">
          <h3>Session Notes</h3>
          <textarea
            value={sessionNotes}
            onChange={(e) => setSessionNotes(e.target.value)}
            placeholder="Add notes about the session progress, insights, or adjustments needed..."
            rows={4}
          />
        </div>
      )}

      {/* Configuration Modal */}
      {showConfigModal && configPhase && configSubstage && (
        <ConfigurationModal
          phase={configPhase}
          substage={configSubstage}
          config={phaseConfig[configPhase]?.substages[configSubstage]}
          currentConfig={phaseConfigurations[`${configPhase}_${configSubstage}`] || {}}
          onSave={handleSaveConfiguration}
          onCancel={() => setShowConfigModal(false)}
          onLaunchQuickSetup={handleLaunchQuickSetup}
        />
      )}

      {/* Quick Dialogue Setup Modal */}
      {showQuickSetup && quickSetupContext && (
        <QuickDialogueSetup
          onCreateDialogue={handleQuickSetupComplete}
          onClose={() => {
            setShowQuickSetup(false);
            setQuickSetupContext(null);
          }}
          onAdvancedSetup={() => {
            setShowQuickSetup(false);
            setQuickSetupContext(null);
            // Could optionally navigate to advanced setup
          }}
          initialParticipantCount={quickSetupContext.participantCount}
          suggestedRoomType={quickSetupContext.suggestedRoomType}
          constrainedTimeMinutes={totalAvailableTime}
        />
      )}
    </div>
  );
};

// Configuration Modal Component
const ConfigurationModal = ({ phase, substage, config, currentConfig, onSave, onCancel, onLaunchQuickSetup }) => {
  const [selectedRoomType, setSelectedRoomType] = useState(
    currentConfig.roomType || config.defaultRoomType || config.suggestedRoomType || ''
  );
  const [selectedCatalyst, setSelectedCatalyst] = useState(
    currentConfig.catalystType || config.defaultCatalyst || ''
  );
  const [customDuration, setCustomDuration] = useState(
    currentConfig.duration || config.duration || 0
  );

  const handleSave = () => {
    const newConfig = {
      roomType: selectedRoomType,
      catalystType: selectedCatalyst,
      duration: customDuration
    };
    onSave(newConfig);
  };

  return (
    <div className="config-modal-overlay" onClick={onCancel}>
      <div className="config-modal" onClick={e => e.stopPropagation()}>
        <div className="config-modal-header">
          <h3>Configure {phase} → {substage}</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        
        <div className="config-modal-content">
          <p className="config-description">{config.description}</p>
          
          {config.roomOptions && (
            <div className="config-section">
              <label>Breakout Room Type:</label>
              <div className="room-type-options">
                {config.roomOptions.map(roomType => (
                  <button
                    key={roomType}
                    className={`room-type-btn ${selectedRoomType === roomType ? 'selected' : ''}`}
                    onClick={() => setSelectedRoomType(roomType)}
                  >
                    <span className="room-type-name">{roomType}</span>
                    <span className="room-type-desc">
                      {getRoomTypeDescription(roomType)}
                    </span>
                  </button>
                ))}
              </div>
              {config.suggestedRoomType && (
                <p className="suggestion">
                  💡 Suggested: <strong>{config.suggestedRoomType}</strong> - {getRoomTypeDescription(config.suggestedRoomType)}
                </p>
              )}
              
              {/* Quick Setup Integration */}
              <div className="quick-setup-integration">
                <div className="quick-setup-divider">
                  <span>OR</span>
                </div>
                <button
                  className="quick-setup-btn"
                  onClick={() => onLaunchQuickSetup && onLaunchQuickSetup(selectedRoomType || config.suggestedRoomType, phase, substage)}
                  title="Launch Quick Setup to automatically create and balance rooms"
                >
                  <span className="quick-setup-icon">🎯</span>
                  <div className="quick-setup-content">
                    <span className="quick-setup-title">Quick Setup</span>
                    <span className="quick-setup-desc">Auto-create balanced {selectedRoomType || config.suggestedRoomType || 'breakout'} rooms</span>
                  </div>
                </button>
              </div>
            </div>
          )}
          
          {config.catalystOptions && (
            <div className="config-section">
              <label>Catalyst Type:</label>
              <div className="catalyst-options">
                {config.catalystOptions.map(catalyst => (
                  <button
                    key={catalyst}
                    className={`catalyst-btn ${selectedCatalyst === catalyst ? 'selected' : ''}`}
                    onClick={() => setSelectedCatalyst(catalyst)}
                  >
                    <span className="catalyst-icon">{getCatalystIcon(catalyst)}</span>
                    <span className="catalyst-name">{catalyst}</span>
                  </button>
                ))}
              </div>
              {config.defaultCatalyst && (
                <p className="suggestion">
                  💡 Suggested: <strong>{config.defaultCatalyst}</strong>
                </p>
              )}
            </div>
          )}
          
          <div className="config-section">
            <label>Duration (minutes):</label>
            <input
              type="number"
              value={Math.round(customDuration / 60)}
              onChange={(e) => setCustomDuration(parseInt(e.target.value) * 60)}
              min="1"
              max="60"
              className="duration-input"
            />
          </div>
        </div>
        
        <div className="config-modal-actions">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button className="save-btn" onClick={handleSave}>Save Configuration</button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getRoomTypeDescription = (roomType) => {
  const descriptions = {
    'dyad': '2 people - intimate sharing',
    'triad': '3 people - diverse perspectives',
    'quad': '4 people - rich dialogue',
    'kiva': '6 people - wisdom circles',
    'individual': 'Personal reflection'
  };
  return descriptions[roomType] || roomType;
};

const getCatalystIcon = (catalyst) => {
  const icons = {
    'meditation': '🧘',
    'reading': '📖',
    'music': '🎵',
    'video': '🎬',
    'art': '🎨',
    'question': '❓',
    'fishbowl': '🐠',
    'movement': '💃'
  };
  return icons[catalyst] || '✨';
};

export default SessionFlowManager;
