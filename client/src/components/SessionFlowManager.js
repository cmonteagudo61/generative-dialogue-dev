import React, { useState, useCallback, useMemo } from 'react';
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
  isVisible = true
}) => {
  // Define the standard dialogue flow
  const defaultPhaseConfig = useMemo(() => ({
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

  const phaseConfig = customPhaseConfig || defaultPhaseConfig;

  // Session state
  const [currentPhase, setCurrentPhase] = useState('Connect');
  const [currentSubstage, setCurrentSubstage] = useState('Catalyst');
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

  // Get current phase and substage config
  const currentPhaseConfig = phaseConfig[currentPhase];
  const currentSubstageConfig = currentPhaseConfig?.substages[currentSubstage];
  const currentDuration = currentSubstageConfig?.duration || 0;

  // Calculate session progress
  const sessionProgress = useMemo(() => {
    const phases = Object.keys(phaseConfig);
    const currentPhaseIndex = phases.indexOf(currentPhase);
    const totalPhases = phases.length;
    
    if (currentPhaseIndex === -1) return 0;
    
    const substages = Object.keys(currentPhaseConfig?.substages || {});
    const currentSubstageIndex = substages.indexOf(currentSubstage);
    const totalSubstages = substages.length;
    
    const phaseProgress = totalSubstages > 0 ? (currentSubstageIndex + 1) / totalSubstages : 1;
    const overallProgress = (currentPhaseIndex + phaseProgress) / totalPhases;
    
    return Math.round(overallProgress * 100);
  }, [currentPhase, currentSubstage, phaseConfig, currentPhaseConfig]);

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
  }, [currentPhase, currentSubstage, currentSubstageConfig, onPhaseChange, onCreateBreakoutRooms, participantCount]);

  // Pause/Resume session
  const handlePauseResume = useCallback(() => {
    setIsTimerRunning(!isTimerRunning);
  }, [isTimerRunning]);

  // Advance to next substage or phase
  const handleAdvanceSubstage = useCallback(() => {
    const substages = Object.keys(currentPhaseConfig?.substages || {});
    const currentSubstageIndex = substages.indexOf(currentSubstage);
    
    if (currentSubstageIndex < substages.length - 1) {
      // Move to next substage
      const nextSubstage = substages[currentSubstageIndex + 1];
      setCurrentSubstage(nextSubstage);
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
  }, [currentPhase, currentSubstage, currentPhaseConfig, onPhaseChange, onCreateBreakoutRooms, participantCount]);

  // Advance to next phase
  const handleAdvancePhase = useCallback(() => {
    const phases = Object.keys(phaseConfig);
    const currentPhaseIndex = phases.indexOf(currentPhase);
    
    if (currentPhaseIndex < phases.length - 1) {
      const nextPhase = phases[currentPhaseIndex + 1];
      const nextPhaseConfig = phaseConfig[nextPhase];
      const firstSubstage = Object.keys(nextPhaseConfig.substages)[0];
      
      setCompletedPhases(prev => [...prev, currentPhase]);
      setCurrentPhase(nextPhase);
      setCurrentSubstage(firstSubstage);
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
    setCurrentPhase(phase);
    setCurrentSubstage(substage);
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
      [configKey]: config
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
                <span className="phase-name">{currentPhase}</span>
                <span className="substage-name">{currentSubstage}</span>
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
                className={`phase-card ${phaseName === currentPhase ? 'current' : ''} ${completedPhases.includes(phaseName) ? 'completed' : ''}`}
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
                    const isConfigured = phaseConfigurations[configKey];
                    
                    return (
                      <div key={substageName} className="substage-container">
                        <button
                          className={`substage-btn ${phaseName === currentPhase && substageName === currentSubstage ? 'current' : ''}`}
                          onClick={() => handleJumpTo(phaseName, substageName)}
                          disabled={!isSessionActive}
                        >
                          <span className="substage-name">{substageName}</span>
                          <span className="substage-duration">{Math.round(substage.duration / 60)}m</span>
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
