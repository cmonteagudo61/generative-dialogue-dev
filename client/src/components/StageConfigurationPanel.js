import React, { useState, useEffect } from 'react';
import './StageConfigurationPanel.css';

const StageConfigurationPanel = ({ 
  config, 
  onConfigUpdate, 
  availableTime,
  participantCount 
}) => {

  // Sample top-rated prompts from library (in production, this would come from API)
  const getTopRatedPrompts = (category) => {
    const promptLibrary = {
      opening: [
        "What brought you here today, and what are you hoping to discover or contribute?",
        "What intention are you bringing to this space, and how do you hope it might serve both your growth and our collective wisdom?",
        "Share your name and one word that captures your energy or focus right now."
      ],
      connect: [
        "Share a story or experience that feels alive and meaningful to you right now.",
        "What's been challenging you lately, and what are you learning from that challenge?",
        "Describe a moment recently when you felt truly connected to something larger than yourself."
      ],
      explore: [
        "What patterns or themes are emerging from our shared stories and experiences?",
        "What questions are arising for you from what you've heard so far?",
        "What would you like to explore more deeply together?"
      ],
      discover: [
        "What wants to emerge that we haven't yet named or acknowledged together?",
        "What collective wisdom is becoming visible through our dialogue?",
        "What possibilities are opening up that we couldn't see before?"
      ],
      closing: [
        "What are you taking from this dialogue that feels most significant?",
        "How has this conversation shifted something in you?",
        "What commitment or next step is emerging for you?"
      ]
    };
    return promptLibrary[category] || [];
  };

  const PromptSelector = ({ stageKey, substageIndex, currentPrompt, onPromptChange }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const topPrompts = getTopRatedPrompts(stageKey);
    
    return (
      <div className="prompt-selector">
        <div className="prompt-selector-header">
          <label>Prompt:</label>
          <div className="prompt-actions">
            <button
              type="button"
              className="prompt-library-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              title="Choose from top-rated prompts"
            >
              📚 Library
            </button>
          </div>
        </div>
        
        {showDropdown && (
          <div className="prompt-dropdown">
            <div className="prompt-dropdown-header">
              <span>⭐ Top-Rated Prompts for {stageKey.charAt(0).toUpperCase() + stageKey.slice(1)}</span>
              <button
                type="button"
                className="close-dropdown"
                onClick={() => setShowDropdown(false)}
              >
                ×
              </button>
            </div>
            <div className="prompt-options">
              {topPrompts.map((prompt, index) => (
                <div
                  key={index}
                  className="prompt-option"
                  onClick={() => {
                    onPromptChange(prompt);
                    setShowDropdown(false);
                  }}
                >
                  <div className="prompt-preview">{prompt}</div>
                  <div className="prompt-stats">⭐ 4.8 • 127 uses</div>
                </div>
              ))}
            </div>
            <div className="prompt-dropdown-footer">
              <button
                type="button"
                className="open-library-btn"
                onClick={() => setShowDropdown(false)}
              >
                🔗 Open Full Library
              </button>
            </div>
          </div>
        )}
        
        <textarea
          value={currentPrompt || ''}
          onChange={(e) => onPromptChange(e.target.value)}
          className="prompt-textarea"
          rows="2"
          placeholder="Enter the guiding question or prompt for this substage..."
        />
      </div>
    );
  };
  const [expandedStage, setExpandedStage] = useState(null);
  const [timeAnalysis, setTimeAnalysis] = useState(null);

  // Calculate total time usage (excluding harvest - post-dialogue)
  const calculateTotalTime = () => {
    let totalTime = 0;
    
    Object.entries(config.stages).forEach(([stageKey, stage]) => {
      if (stage.enabled && stage.substages) {
        // Exclude harvest from committed dialogue time - it's post-dialogue
        if (stageKey === 'harvest') return;
        
        stage.substages.forEach(substage => {
          totalTime += parseInt(substage.duration) || 0;
        });
      }
    });
    
    return totalTime;
  };

  // Update time analysis when config changes
  useEffect(() => {
    const totalUsed = calculateTotalTime();
    const available = parseInt(availableTime) || 90;
    const remaining = available - totalUsed;
    const overTime = totalUsed > available;
    const utilizationPercent = Math.round((totalUsed / available) * 100);
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development' && totalUsed !== timeAnalysis.totalUsed) {
      console.log('Time Analysis Update:', {
        totalUsed,
        available,
        remaining,
        overTime,
        utilizationPercent
      });
    }
    
    setTimeAnalysis({
      totalUsed,
      available,
      remaining,
      overTime,
      utilizationPercent
    });
  }, [config, availableTime]);

  // Breakout size options
  const breakoutOptions = [
    { value: 'community', label: '👥 Community', description: 'Full group discussion' },
    { value: 'dyad', label: '👫 Dyad (2)', description: 'Intimate pairs' },
    { value: 'triad', label: '👥 Triad (3)', description: 'Deep dialogue' },
    { value: 'quad', label: '👥 Quad (4)', description: 'Diverse perspectives' },
    { value: 'kiva', label: '👥 Kiva (6)', description: 'Complex exploration' },
    { value: 'breakout-processing', label: '📝 Processing', description: 'Transcript review' }
  ];

  // Stage templates for quick setup
  const stageTemplates = {
    connect: {
      name: 'Connect',
      icon: '🤝',
      description: 'Building relationships and trust',
      recommendedBreakout: 'dyad',
      minTime: 15,
      optimalTime: 20
    },
    explore: {
      name: 'Explore',
      icon: '🔍',
      description: 'Investigating the topic together',
      recommendedBreakout: 'triad',
      minTime: 20,
      optimalTime: 25
    },
    discover: {
      name: 'Discover',
      icon: '💡',
      description: 'Uncovering new insights',
      recommendedBreakout: 'quad',
      minTime: 25,
      optimalTime: 30
    },
    harvest: {
      name: 'Harvest',
      icon: '🌾',
      description: 'Gathering collective wisdom',
      recommendedBreakout: 'community',
      minTime: 10,
      optimalTime: 15
    },
    closing: {
      name: 'Closing',
      icon: '🙏',
      description: 'Integration and completion',
      recommendedBreakout: 'community',
      minTime: 5,
      optimalTime: 10
    }
  };

  // Update substage configuration
  const updateSubstage = (stageKey, substageIndex, field, value) => {
    let updatedSubstage = { ...config.stages[stageKey].substages[substageIndex], [field]: value };
    
    // Auto-adjust duration when viewMode changes for dialogue substages
    if (field === 'viewMode' && updatedSubstage.name === 'Dialogue') {
      const newDuration = calculateOptimalDuration(value, participantCount);
      updatedSubstage.duration = newDuration;
    }
    
    const updatedConfig = {
      ...config,
      stages: {
        ...config.stages,
        [stageKey]: {
          ...config.stages[stageKey],
          substages: config.stages[stageKey].substages.map((substage, index) => 
            index === substageIndex 
              ? updatedSubstage
              : substage
          )
        }
      }
    };
    
    onConfigUpdate(updatedConfig);
  };

  // Calculate optimal duration based on breakout size and participant count
  const calculateOptimalDuration = (viewMode, totalParticipants) => {
    const participants = parseInt(totalParticipants) || 12;
    const minSpeakingTimePerPerson = 5; // minutes - minimum for meaningful engagement
    
    switch(viewMode) {
      case 'dyad': 
        return 2 * minSpeakingTimePerPerson; // 10 minutes minimum
      case 'triad': 
        return 3 * minSpeakingTimePerPerson; // 15 minutes minimum
      case 'quad': 
        return 4 * minSpeakingTimePerPerson; // 20 minutes minimum
      case 'kiva': 
        return 6 * minSpeakingTimePerPerson; // 30 minutes minimum (6 people)
      case 'community':
        return Math.max(15, Math.ceil(participants / 2)); // Scale with group size, min 15
      case 'breakout-processing':
        return 5; // Fixed processing time
      default:
        return 15; // Default fallback
    }
  };

  // Get minimum duration for a breakout type
  const getMinimumDuration = (viewMode) => {
    switch(viewMode) {
      case 'dyad': return 10;
      case 'triad': return 15;
      case 'quad': return 20;
      case 'kiva': return 30;
      case 'community': return 15;
      case 'breakout-processing': return 5;
      default: return 10;
    }
  };

  // Check if duration is below minimum for breakout type
  const isDurationTooShort = (viewMode, duration) => {
    const minDuration = getMinimumDuration(viewMode);
    return parseInt(duration) < minDuration;
  };

  // Quick time adjustments
  const adjustStageTime = (stageKey, adjustment) => {
    const stage = config.stages[stageKey];
    if (!stage || !stage.substages) return;

    const updatedSubstages = stage.substages.map(substage => ({
      ...substage,
      duration: Math.max(1, (parseInt(substage.duration) || 0) + adjustment)
    }));

    const updatedConfig = {
      ...config,
      stages: {
        ...config.stages,
        [stageKey]: {
          ...stage,
          substages: updatedSubstages
        }
      }
    };
    
    onConfigUpdate(updatedConfig);
  };

  // Adjust individual substage time
  const adjustSubstageTime = (stageKey, substageIndex, adjustment) => {
    const stage = config.stages[stageKey];
    if (!stage || !stage.substages || !stage.substages[substageIndex]) return;

    const updatedSubstages = [...stage.substages];
    updatedSubstages[substageIndex] = {
      ...updatedSubstages[substageIndex],
      duration: Math.max(1, (parseInt(updatedSubstages[substageIndex].duration) || 0) + adjustment)
    };

    const updatedConfig = {
      ...config,
      stages: {
        ...config.stages,
        [stageKey]: {
          ...stage,
          substages: updatedSubstages
        }
      }
    };
    
    onConfigUpdate(updatedConfig);
  };

  // Apply stage template
  const applyStageTemplate = (stageKey, template) => {
    const stage = config.stages[stageKey];
    if (!stage || !stage.substages) return;

    // Find dialogue substage and update its viewMode
    const updatedSubstages = stage.substages.map(substage => {
      if (substage.name === 'Dialogue') {
        return {
          ...substage,
          viewMode: template.recommendedBreakout,
          duration: template.optimalTime
        };
      }
      return substage;
    });

    const updatedConfig = {
      ...config,
      stages: {
        ...config.stages,
        [stageKey]: {
          ...stage,
          substages: updatedSubstages
        }
      }
    };
    
    onConfigUpdate(updatedConfig);
  };

  // Get breakout info for display
  const getBreakoutInfo = (viewMode) => {
    const option = breakoutOptions.find(opt => opt.value === viewMode);
    return option || { label: viewMode, description: 'Custom configuration' };
  };

  // Calculate rooms needed for a viewMode
  const calculateRooms = (viewMode) => {
    const participants = parseInt(participantCount) || 12;
    switch(viewMode) {
      case 'dyad': return Math.ceil(participants / 2);
      case 'triad': return Math.ceil(participants / 3);
      case 'quad': return Math.ceil(participants / 4);
      case 'kiva': return Math.ceil(participants / 6);
      case 'community': return 1;
      case 'breakout-processing': return 'varies';
      default: return '?';
    }
  };

  return (
    <div className="stage-configuration-panel">
      {/* Floating Time Monitor - Always Visible */}
      <div className="floating-time-monitor">
        <div className="floating-time-content">
          <div className="floating-time-main">
            <span className="time-icon">⏱️</span>
            <div className={`floating-time-status ${timeAnalysis?.overTime ? 'over-time' : 'on-time'}`}>
              {timeAnalysis?.totalUsed}min / {timeAnalysis?.available}min
            </div>
            <div className="floating-percentage">
              ({timeAnalysis?.utilizationPercent}%)
            </div>
          </div>
          <div className="floating-time-bar">
            <div 
              className={`floating-time-fill ${timeAnalysis?.overTime ? 'over-time' : timeAnalysis?.utilizationPercent === 100 ? 'perfect' : ''}`}
              style={{ width: `${Math.min(100, timeAnalysis?.utilizationPercent || 0)}%` }}
            ></div>
          </div>
          {timeAnalysis?.overTime && (
            <div className="floating-warning">
              ⚠️ Over by {Math.abs(timeAnalysis.remaining)}min
            </div>
          )}
          {!timeAnalysis?.overTime && timeAnalysis?.remaining > 0 && (
            <div className="floating-buffer">
              ✅ {timeAnalysis.remaining}min buffer
            </div>
          )}
        </div>
      </div>

      {/* Original Time Overview - For Reference */}
      <div className="time-overview">
        <div className="time-header">
          <h3>⏱️ Time Configuration</h3>
          <div className={`time-status ${timeAnalysis?.overTime ? 'over-time' : 'on-time'}`}>
            {timeAnalysis?.totalUsed}min / {timeAnalysis?.available}min
            ({timeAnalysis?.utilizationPercent}%)
          </div>
        </div>
        
        <div className="time-bar">
          <div 
            className={`time-fill ${timeAnalysis?.overTime ? 'over-time' : timeAnalysis?.utilizationPercent === 100 ? 'perfect' : ''}`}
            style={{ width: `${Math.min(100, timeAnalysis?.utilizationPercent || 0)}%` }}
          ></div>
        </div>
        
        {timeAnalysis?.overTime && (
          <div className="time-warning">
            ⚠️ Over by {Math.abs(timeAnalysis.remaining)} minutes - consider reducing stage durations
          </div>
        )}
        
        {!timeAnalysis?.overTime && timeAnalysis?.remaining > 0 && (
          <div className="time-buffer">
            ✅ {timeAnalysis.remaining} minutes buffer time available
          </div>
        )}
      </div>

      {/* Stage Configuration */}
      <div className="stages-configuration">
        <h3>🎭 Stage-by-Stage Configuration</h3>
        
        {/* Synchronous Dialogue Activity */}
        <div className="activity-section">
          <div className="activity-header synchronous">
            <h4>🤝 Synchronous Dialogue Activity</h4>
            <p>Group time - all participants present together</p>
          </div>
          
          {Object.entries(config.stages).map(([stageKey, stage]) => {
            if (!stage.enabled || stageKey === 'harvest') return null;
          
          const template = stageTemplates[stageKey];
          const isExpanded = expandedStage === stageKey;
          
          return (
            <div key={stageKey} className="stage-config-card">
              <div 
                className="stage-header"
                onClick={() => setExpandedStage(isExpanded ? null : stageKey)}
              >
                <div className="stage-info">
                  <span className="stage-icon">{template?.icon || '🎭'}</span>
                  <div className="stage-details">
                    <h4>{template?.name || stageKey}</h4>
                    <p>{template?.description || 'Custom stage configuration'}</p>
                  </div>
                </div>
                
                <div className="stage-summary">
                  <div className="stage-time">
                    {stage.substages?.reduce((total, sub) => total + (parseInt(sub.duration) || 0), 0)}min
                  </div>
                  <div className="expand-icon">
                    {isExpanded ? '▼' : '▶'}
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="stage-details-panel">
                  {/* Quick Actions */}
                  <div className="quick-actions">
                    <button 
                      className="quick-btn"
                      onClick={() => applyStageTemplate(stageKey, template)}
                      title={`Apply ${template?.name} template`}
                    >
                      🎯 Apply Template
                    </button>
                    <button 
                      className="quick-btn"
                      onClick={() => adjustStageTime(stageKey, -5)}
                      title="Reduce by 5 minutes"
                    >
                      ⏪ -5min
                    </button>
                    <button 
                      className="quick-btn"
                      onClick={() => adjustStageTime(stageKey, 5)}
                      title="Add 5 minutes"
                    >
                      ⏩ +5min
                    </button>
                  </div>

                  {/* Substage Configuration */}
                  <div className="substages-config">
                    {stage.substages?.map((substage, index) => (
                      <div key={index} className="substage-config">
                        <div className="substage-header">
                          <h5>{substage.name}</h5>
                          <div className="substage-controls">
                            <input
                              type="number"
                              value={substage.duration || 0}
                              onChange={(e) => updateSubstage(stageKey, index, 'duration', parseInt(e.target.value))}
                              className={`duration-input ${isDurationTooShort(substage.viewMode, substage.duration) ? 'duration-warning' : ''}`}
                              min="1"
                              max="60"
                            />
                            <span className="duration-label">min</span>
                            {isDurationTooShort(substage.viewMode, substage.duration) && (
                              <div className="duration-warning-text compact">
                                ⚠️ {getMinimumDuration(substage.viewMode)}min minimum
                              </div>
                            )}
                          </div>
                        </div>

                        {substage.name === 'Dialogue' && (
                          <div className="breakout-config">
                            <label>Breakout Configuration:</label>
                            <select
                              value={substage.viewMode || 'triad'}
                              onChange={(e) => updateSubstage(stageKey, index, 'viewMode', e.target.value)}
                              className="breakout-select"
                            >
                              {breakoutOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                            
                            <div className="breakout-info">
                              <span className="rooms-count">
                                {calculateRooms(substage.viewMode)} rooms
                              </span>
                              <span className="breakout-description">
                                {getBreakoutInfo(substage.viewMode).description}
                              </span>
                            </div>
                          </div>
                        )}

                        <PromptSelector
                          stageKey={stageKey}
                          substageIndex={index}
                          currentPrompt={substage.prompt || ''}
                          onPromptChange={(prompt) => updateSubstage(stageKey, index, 'prompt', prompt)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        </div>
        
        {/* Asynchronous Dialogue Activity */}
        <div className="activity-section">
          <div className="activity-header asynchronous">
            <h4>🏠 Asynchronous Dialogue Activity</h4>
            <p>Individual time - participants complete on their own schedule</p>
          </div>
          
          {Object.entries(config.stages).map(([stageKey, stage]) => {
            if (!stage.enabled || stageKey !== 'harvest') return null;
          
            const template = stageTemplates[stageKey];
            const isExpanded = expandedStage === stageKey;
            
            return (
              <div key={stageKey} className="stage-config-card">
                <div 
                  className="stage-header"
                  onClick={() => setExpandedStage(isExpanded ? null : stageKey)}
                >
                  <div className="stage-info">
                    <span className="stage-icon">{template?.icon || '🌾'}</span>
                    <div className="stage-details">
                      <h4>{template?.name || stageKey}</h4>
                      <p>{template?.description || 'Individual reflection and harvest'}</p>
                    </div>
                  </div>
                  
                  <div className="stage-summary">
                    <div className="stage-time">
                      {stage.substages?.reduce((total, sub) => total + (parseInt(sub.duration) || 0), 0)}min
                    </div>
                    <div className="expand-icon">
                      {isExpanded ? '▼' : '▶'}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="stage-details-panel">
                    {/* Quick Actions */}
                    <div className="quick-actions">
                      <button 
                        className="quick-btn"
                        onClick={() => applyStageTemplate(stageKey, template)}
                        title={`Apply ${template?.name} template`}
                      >
                        🎯 Apply Template
                      </button>
                    </div>

                    {/* Substages */}
                    <div className="substages">
                      {stage.substages?.map((substage, index) => (
                        <div key={index} className="substage-config">
                          <div className="substage-header">
                            <h5>{substage.name}</h5>
                            <div className="substage-controls">
                              <button 
                                className="quick-btn"
                                onClick={() => adjustSubstageTime(stageKey, index, -5)}
                                title="Reduce by 5 minutes"
                              >
                                -5min
                              </button>
                              <button 
                                className="quick-btn"
                                onClick={() => adjustSubstageTime(stageKey, index, 5)}
                                title="Add 5 minutes"
                              >
                                +5min
                              </button>
                            </div>
                          </div>

                          <div className="substage-settings">
                            <div className="duration-config">
                              <label className="duration-label">Duration:</label>
                              <input
                                type="number"
                                value={substage.duration || 0}
                                onChange={(e) => updateSubstage(stageKey, index, 'duration', parseInt(e.target.value))}
                                className={`duration-input ${isDurationTooShort(substage.viewMode, substage.duration) ? 'duration-warning' : ''}`}
                                min="1"
                                max="120"
                              />
                              <span>minutes</span>
                              {isDurationTooShort(substage.viewMode, substage.duration) && (
                                <div className="duration-warning-text">
                                  ⚠️ Too short! {substage.viewMode} needs minimum {getMinimumDuration(substage.viewMode)} minutes for meaningful engagement
                                </div>
                              )}
                            </div>

                            {substage.viewMode && substage.viewMode !== 'individual' && (
                              <div className="breakout-config">
                                <label>Breakout Configuration:</label>
                                <select
                                  value={substage.viewMode || 'community'}
                                  onChange={(e) => updateSubstage(stageKey, index, 'viewMode', e.target.value)}
                                  className="breakout-select"
                                >
                                  {breakoutOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                
                                {substage.viewMode && substage.viewMode !== 'community' && substage.viewMode !== 'breakout-processing' && (
                                  <div className="rooms-count">
                                    {calculateRooms(substage.viewMode)} rooms
                                  </div>
                                )}
                                
                                <div className="breakout-description">
                                  {getBreakoutInfo(substage.viewMode).description}
                                </div>
                              </div>
                            )}

                            <PromptSelector
                              stageKey={stageKey}
                              substageIndex={index}
                              currentPrompt={substage.prompt || ''}
                              onPromptChange={(prompt) => updateSubstage(stageKey, index, 'prompt', prompt)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Expert Tips */}
      <div className="expert-tips">
        <h4>💡 Expert Facilitation Tips</h4>
        <div className="tips-grid">
          <div className="tip-card">
            <strong>🤝 Connect Stage:</strong> Use dyads for intimate sharing, builds trust quickly
          </div>
          <div className="tip-card">
            <strong>🔍 Explore Stage:</strong> Triads offer optimal balance of intimacy and diversity
          </div>
          <div className="tip-card">
            <strong>💡 Discover Stage:</strong> Quads or kivas for complex topics needing multiple perspectives
          </div>
          <div className="tip-card">
            <strong>⏱️ Time Buffer:</strong> Keep 10-15% buffer for deeper conversations that emerge
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageConfigurationPanel;
