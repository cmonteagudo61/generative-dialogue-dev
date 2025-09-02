import React, { useState, useEffect } from 'react';
import './TimeGuidance.css';

const TimeGuidance = ({ 
  availableTime, 
  participantCount, 
  currentConfig, 
  onRecommendationApply,
  onConfigUpdate 
}) => {
  const [recommendations, setRecommendations] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [timeAnalysis, setTimeAnalysis] = useState(null);

  // Core time guidance principles
  const TIME_PRINCIPLES = {
    MIN_SPEAKING_TIME_PER_PERSON: 3, // minutes minimum per person in breakouts (reduced from 5)
    SETUP_BUFFER: 3, // minutes for technical setup (reduced from 5)
    TRANSITION_BUFFER: 1, // minutes between stages (reduced from 2)
    COMMUNITY_OVERHEAD: 1.2, // multiplier for community discussions vs breakouts (reduced from 1.5)
    MAX_BREAKOUT_SIZE: 6, // maximum people per breakout room
    OPTIMAL_BREAKOUT_SIZE: 3, // sweet spot for deep dialogue
  };

  // Calculate optimal breakout configurations
  const calculateBreakoutRecommendations = (totalTime, participants) => {
    if (!totalTime || !participants) return null;

    const availableMinutes = parseInt(totalTime);
    const participantNum = parseInt(participants);

    if (availableMinutes < 30 || participantNum < 2) {
      return {
        feasible: false,
        reason: availableMinutes < 30 ? 'Minimum 30 minutes needed for meaningful dialogue' : 'At least 2 participants required'
      };
    }

    // Calculate different breakout size options
    const options = [];
    
    for (let breakoutSize = 2; breakoutSize <= Math.min(TIME_PRINCIPLES.MAX_BREAKOUT_SIZE, participantNum); breakoutSize++) {
      const numRooms = Math.ceil(participantNum / breakoutSize);
      const actualParticipantsPerRoom = participantNum / numRooms;
      
      // Calculate time allocation
      const speakingTimePerPerson = TIME_PRINCIPLES.MIN_SPEAKING_TIME_PER_PERSON;
      const minBreakoutTime = Math.ceil(actualParticipantsPerRoom * speakingTimePerPerson);
      
      // Account for setup, transitions, and community time
      const setupTime = TIME_PRINCIPLES.SETUP_BUFFER;
      const transitionTime = TIME_PRINCIPLES.TRANSITION_BUFFER * 3; // between stages (reduced)
      const communityTime = Math.ceil(minBreakoutTime * TIME_PRINCIPLES.COMMUNITY_OVERHEAD);
      
      // More realistic time calculation - not every stage needs full community time
      const totalMinimumTime = setupTime + (minBreakoutTime * 2) + (communityTime * 2) + transitionTime;
      
      const feasible = totalMinimumTime <= availableMinutes;
      const efficiency = feasible ? (availableMinutes - totalMinimumTime) / availableMinutes : 0;
      
      options.push({
        breakoutSize,
        numRooms,
        actualSize: Math.round(actualParticipantsPerRoom * 10) / 10,
        minBreakoutTime,
        communityTime,
        totalMinimumTime,
        availableBuffer: Math.max(0, availableMinutes - totalMinimumTime),
        feasible,
        efficiency,
        quality: calculateQualityScore(breakoutSize, actualParticipantsPerRoom, efficiency)
      });
    }

    // Sort by quality score (feasible first, then by quality)
    options.sort((a, b) => {
      if (a.feasible !== b.feasible) return b.feasible - a.feasible;
      return b.quality - a.quality;
    });

    return {
      feasible: options.some(opt => opt.feasible),
      options: options.slice(0, 3), // Top 3 recommendations
      recommended: options[0],
      timeBreakdown: calculateDetailedTimeBreakdown(options[0], availableMinutes)
    };
  };

  // Calculate quality score for breakout configuration
  const calculateQualityScore = (breakoutSize, actualSize, efficiency) => {
    // Prefer sizes closer to optimal (3), penalize very large groups
    const sizeScore = 1 - Math.abs(breakoutSize - TIME_PRINCIPLES.OPTIMAL_BREAKOUT_SIZE) / 4;
    
    // Prefer even distribution (actual size close to whole number)
    const distributionScore = 1 - Math.abs(actualSize - Math.round(actualSize));
    
    // Prefer configurations with some buffer time
    const efficiencyScore = Math.min(efficiency * 2, 1); // Cap at 1
    
    return (sizeScore * 0.4 + distributionScore * 0.3 + efficiencyScore * 0.3);
  };

  // Calculate detailed time breakdown for a configuration
  const calculateDetailedTimeBreakdown = (config, totalTime) => {
    if (!config || !config.feasible) return null;

    const stages = {
      opening: {
        name: 'Opening & Setup',
        duration: TIME_PRINCIPLES.SETUP_BUFFER + 10,
        description: 'Technical setup, introductions, and context setting'
      },
      connect: {
        name: 'Connect Stage',
        catalyst: 5,
        dialogue: config.minBreakoutTime,
        summary: 5,
        we: config.communityTime,
        total: 5 + config.minBreakoutTime + 5 + config.communityTime,
        description: 'Initial connection and sharing in pairs'
      },
      explore: {
        name: 'Explore Stage', 
        catalyst: 5,
        dialogue: config.minBreakoutTime + 5, // Slightly longer for deeper exploration
        summary: 5,
        we: config.communityTime,
        total: 5 + config.minBreakoutTime + 5 + 5 + config.communityTime,
        description: 'Deeper inquiry in triads'
      },
      discover: {
        name: 'Discover Stage',
        catalyst: 5,
        dialogue: config.minBreakoutTime + 10, // Longest dialogue time
        summary: 5,
        we: config.communityTime + 5, // Longer community synthesis
        total: 5 + config.minBreakoutTime + 10 + 5 + config.communityTime + 5,
        description: 'Emergence and collective wisdom in quads'
      },
      harvest: {
        name: 'Harvest & Closing',
        individual: 10,
        sharing: 15,
        total: 25,
        description: 'Individual reflection and collective harvest'
      }
    };

    const totalUsed = stages.opening.duration + stages.connect.total + 
                     stages.explore.total + stages.discover.total;
    // Note: harvest.total is excluded - it's post-dialogue time
    
    const buffer = totalTime - totalUsed;

    return {
      stages,
      totalUsed,
      totalAvailable: totalTime,
      buffer,
      bufferPercentage: (buffer / totalTime) * 100
    };
  };

  // Analyze current configuration for time issues
  const analyzeCurrentConfig = (config) => {
    if (!config || !availableTime || !participantCount) return null;

    const currentTotal = calculateCurrentDuration(config);
    const available = parseInt(availableTime);
    
    const issues = [];
    const suggestions = [];

    // Check if total time exceeds available time
    if (currentTotal > available) {
      issues.push({
        type: 'overflow',
        severity: 'high',
        message: `Configuration exceeds available time by ${currentTotal - available} minutes`,
        suggestion: 'Reduce stage durations or disable some stages'
      });
    }

    // Check for unrealistic breakout times
    const participants = parseInt(participantCount);
    if (participants > 0) {
      const stages = ['connect', 'explore', 'discover'];
      stages.forEach(stageName => {
        const stage = config.stages?.[stageName];
        if (stage?.enabled) {
          const dialogueSubstage = stage.substages?.find(s => s.name === 'Dialogue');
          if (dialogueSubstage) {
            const breakoutSize = getBreakoutSize(dialogueSubstage.viewMode);
            const minTime = breakoutSize * TIME_PRINCIPLES.MIN_SPEAKING_TIME_PER_PERSON;
            
            if (dialogueSubstage.duration < minTime) {
              issues.push({
                type: 'insufficient_time',
                severity: 'medium',
                stage: stageName,
                message: `${stageName} dialogue needs ${minTime}min for ${breakoutSize}-person breakouts (currently ${dialogueSubstage.duration}min)`,
                suggestion: `Increase to ${minTime} minutes or reduce breakout size`
              });
            }
          }
        }
      });
    }

    // Generate optimization suggestions
    if (currentTotal < available * 0.8) {
      suggestions.push({
        type: 'underutilized',
        message: `You have ${available - currentTotal} minutes of unused time`,
        suggestion: 'Consider extending dialogue stages or adding more reflection time'
      });
    }

    return {
      currentDuration: currentTotal,
      availableDuration: available,
      utilization: (currentTotal / available) * 100,
      issues,
      suggestions,
      feasible: issues.filter(i => i.severity === 'high').length === 0
    };
  };

  // Helper function to get breakout size from view mode
  const getBreakoutSize = (viewMode) => {
    const sizes = {
      'dyad': 2,
      'triad': 3,
      'quad': 4,
      'community': 1,
      'individual': 1
    };
    return sizes[viewMode] || 2;
  };

  // Calculate current configuration duration
  const calculateCurrentDuration = (config) => {
    if (!config?.stages) return 0;
    
    let total = 0;
    Object.entries(config.stages).forEach(([stageKey, stage]) => {
      if (stage.enabled && stage.substages) {
        // Exclude harvest from committed dialogue time - it's post-dialogue
        if (stageKey === 'harvest') return;
        
        stage.substages.forEach(substage => {
          total += substage.duration || 0;
        });
      }
    });
    return total;
  };

  // Update recommendations when inputs change
  useEffect(() => {
    if (availableTime && participantCount) {
      const recs = calculateBreakoutRecommendations(availableTime, participantCount);
      setRecommendations(recs);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTime, participantCount]);

  // Update analysis when config changes
  useEffect(() => {
    if (currentConfig) {
      const analysis = analyzeCurrentConfig(currentConfig);
      setTimeAnalysis(analysis);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConfig, availableTime, participantCount]);

  // Apply recommended configuration
  const applyRecommendation = (option) => {
    if (!option || !onRecommendationApply) {
      console.error('❌ Apply recommendation failed:', { option, onRecommendationApply });
      return;
    }

    console.log('✅ Applying recommendation:', option);
    const optimizedConfig = generateOptimizedConfig(option);
    console.log('✅ Generated config:', optimizedConfig);
    onRecommendationApply(optimizedConfig);
  };

  // Generate optimized configuration based on recommendation
  const generateOptimizedConfig = (option) => {
    const breakdown = calculateDetailedTimeBreakdown(option, parseInt(availableTime));
    
    // Determine the correct viewMode based on breakout size
    const getViewModeForBreakout = (size) => {
      switch(size) {
        case 2: return 'dyad';
        case 3: return 'triad';
        case 4: return 'quad';
        case 5: return 'kiva';
        default: return 'triad';
      }
    };
    
    const breakoutViewMode = getViewModeForBreakout(option.breakoutSize);
    
    return {
      stages: {
        opening: {
          enabled: true,
          substages: [{
            id: 'opening-1',
            name: 'Technical Setup & Welcome',
            viewMode: 'community',
            duration: breakdown.stages.opening.duration,
            prompt: 'Welcome everyone! Let\'s ensure everyone can see and hear clearly, then we\'ll begin with introductions.'
          }]
        },
        connect: {
          enabled: true,
          substages: [
            {
              id: 'connect-catalyst',
              name: 'Catalyst',
              viewMode: 'community',
              duration: breakdown.stages.connect.catalyst,
              prompt: 'Let\'s begin with a moment to center ourselves and connect to what brought us here today.'
            },
            {
              id: 'connect-dialogue',
              name: 'Dialogue',
              viewMode: breakoutViewMode,
              duration: breakdown.stages.connect.dialogue,
              prompt: 'Share with your group: What is alive in you right now? What brought you to this conversation?'
            },
            {
              id: 'connect-summary',
              name: 'Summary',
              viewMode: 'breakout-processing',
              duration: breakdown.stages.connect.summary,
              prompt: 'Review your transcript, make any edits, then create a summary of your key insights.'
            },
            {
              id: 'connect-we',
              name: 'WE',
              viewMode: 'community',
              duration: breakdown.stages.connect.we,
              prompt: 'What themes are emerging from our connections?'
            }
          ]
        },
        explore: {
          enabled: true,
          substages: [
            {
              id: 'explore-catalyst',
              name: 'Catalyst',
              viewMode: 'community',
              duration: breakdown.stages.explore.catalyst,
              prompt: 'Let\'s deepen our inquiry with a catalyst to open new perspectives.'
            },
            {
              id: 'explore-dialogue',
              name: 'Dialogue',
              viewMode: breakoutViewMode,
              duration: breakdown.stages.explore.dialogue,
              prompt: 'Building on what emerged in Connect, what wants to be explored more deeply?'
            },
            {
              id: 'explore-summary',
              name: 'Summary',
              viewMode: 'breakout-processing',
              duration: breakdown.stages.explore.summary,
              prompt: 'Capture the essence of your exploration. What insights emerged?'
            },
            {
              id: 'explore-we',
              name: 'WE',
              viewMode: 'community',
              duration: breakdown.stages.explore.we,
              prompt: 'What patterns are emerging across our explorations?'
            }
          ]
        },
        discover: {
          enabled: true,
          substages: [
            {
              id: 'discover-catalyst',
              name: 'Catalyst',
              viewMode: 'community',
              duration: breakdown.stages.discover.catalyst,
              prompt: 'Let\'s open to what wants to emerge that we haven\'t yet touched.'
            },
            {
              id: 'discover-dialogue',
              name: 'Dialogue',
              viewMode: breakoutViewMode,
              duration: breakdown.stages.discover.dialogue,
              prompt: 'What is trying to emerge through our conversation? What wants to be discovered or created together?'
            },
            {
              id: 'discover-summary',
              name: 'Summary',
              viewMode: 'breakout-processing',
              duration: breakdown.stages.discover.summary,
              prompt: 'Distill the essence of what emerged. What discoveries surfaced?'
            },
            {
              id: 'discover-we',
              name: 'WE',
              viewMode: 'community',
              duration: breakdown.stages.discover.we,
              prompt: 'What is the collective wisdom that has emerged?'
            }
          ]
        },
        harvest: {
          enabled: true,
          substages: [
            {
              id: 'harvest-individual',
              name: 'Individual Reflection',
              viewMode: 'individual',
              duration: breakdown.stages.harvest.individual + breakdown.stages.harvest.sharing,
              prompt: 'Take time for personal reflection on your journey through this dialogue. What insights, learnings, or commitments are you taking from this experience?'
            }
          ]
        }
      }
    };
  };

  if (!availableTime || !participantCount) {
    return (
      <div className="time-guidance">
        <div className="guidance-header">
          <h3>⏰ Time Guidance</h3>
          <p>Enter available time and participant count to get personalized recommendations</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-guidance">
      <div className="guidance-header">
        <h3>⏰ Time Guidance</h3>
        <p>Smart recommendations based on {availableTime} minutes with {participantCount} participants</p>
      </div>

      {/* Current Configuration Analysis */}
      {timeAnalysis && (
        <div className="current-analysis">
          <div className="analysis-header">
            <h4>📊 Current Configuration</h4>
            <div className="time-utilization">
              <div className="utilization-bar">
                <div 
                  className={`utilization-fill ${timeAnalysis.utilization > 100 ? 'overflow' : timeAnalysis.utilization === 100 ? 'perfect' : timeAnalysis.utilization > 95 ? 'high' : 'normal'}`}
                  style={{ width: `${Math.min(timeAnalysis.utilization, 100)}%` }}
                ></div>
              </div>
              <span className="utilization-text">
                {timeAnalysis.currentDuration}min / {timeAnalysis.availableDuration}min 
                ({Math.round(timeAnalysis.utilization)}%)
              </span>
            </div>
          </div>

          {/* Issues and Suggestions */}
          {(timeAnalysis.issues.length > 0 || timeAnalysis.suggestions.length > 0) && (
            <div className="analysis-feedback">
              {timeAnalysis.issues.map((issue, idx) => (
                <div key={idx} className={`feedback-item issue ${issue.severity}`}>
                  <div className="feedback-icon">
                    {issue.severity === 'high' ? '🚨' : '⚠️'}
                  </div>
                  <div className="feedback-content">
                    <div className="feedback-message">{issue.message}</div>
                    <div className="feedback-suggestion">{issue.suggestion}</div>
                  </div>
                </div>
              ))}
              
              {timeAnalysis.suggestions.map((suggestion, idx) => (
                <div key={idx} className="feedback-item suggestion">
                  <div className="feedback-icon">💡</div>
                  <div className="feedback-content">
                    <div className="feedback-message">{suggestion.message}</div>
                    <div className="feedback-suggestion">{suggestion.suggestion}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {recommendations && (
        <div className="recommendations">
          <div className="recommendations-header">
            <h4>🎯 Recommended Configurations</h4>
            {!recommendations.feasible && (
              <div className="infeasible-notice">
                <span className="notice-icon">⚠️</span>
                <span>{recommendations.reason}</span>
              </div>
            )}
          </div>

          {recommendations.feasible && (
            <div className="recommendation-options">
              {recommendations.options.map((option, idx) => (
                <div 
                  key={idx} 
                  className={`recommendation-card ${idx === 0 ? 'recommended' : ''} ${!option.feasible ? 'infeasible' : ''}`}
                >
                  <div className="card-header">
                    <div className="card-title">
                      <span className="breakout-size">{option.breakoutSize}-person breakouts</span>
                      {idx === 0 && <span className="recommended-badge">Recommended</span>}
                    </div>
                    <div className="card-meta">
                      {option.numRooms} rooms • {option.actualSize} avg per room
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="time-breakdown">
                      <div className="breakdown-item">
                        <span className="label">Dialogue Time:</span>
                        <span className="value">{option.minBreakoutTime}min per stage</span>
                      </div>
                      <div className="breakdown-item">
                        <span className="label">Community Time:</span>
                        <span className="value">{option.communityTime}min per stage</span>
                      </div>
                      <div className="breakdown-item">
                        <span className="label">Total Minimum:</span>
                        <span className="value">{option.totalMinimumTime}min</span>
                      </div>
                      <div className="breakdown-item">
                        <span className="label">Buffer Time:</span>
                        <span className="value buffer">{option.availableBuffer}min</span>
                      </div>
                    </div>

                    <div className="quality-indicators">
                      <div className="quality-bar">
                        <div 
                          className="quality-fill"
                          style={{ width: `${option.quality * 100}%` }}
                        ></div>
                      </div>
                      <span className="quality-text">
                        Quality Score: {Math.round(option.quality * 100)}%
                      </span>
                    </div>
                  </div>

                  {option.feasible && (
                    <div className="card-actions">
                      <button
                        className="apply-btn"
                        onClick={() => applyRecommendation(option)}
                      >
                        Apply Configuration
                      </button>
                      <button
                        className="details-btn"
                        onClick={() => setShowDetails(showDetails === idx ? null : idx)}
                      >
                        {showDetails === idx ? 'Hide Details' : 'Show Details'}
                      </button>
                    </div>
                  )}

                  {showDetails === idx && option.feasible && (
                    <div className="detailed-breakdown">
                      {recommendations.timeBreakdown && (
                        <div className="stage-breakdown">
                          <h5>Detailed Time Allocation</h5>
                          {Object.entries(recommendations.timeBreakdown.stages).map(([key, stage]) => (
                            <div key={key} className="stage-detail">
                              <div className="stage-name">{stage.name}</div>
                              <div className="stage-time">{stage.total || stage.duration}min</div>
                              <div className="stage-description">{stage.description}</div>
                            </div>
                          ))}
                          <div className="breakdown-summary">
                            <div className="summary-item">
                              <span>Total Used: {recommendations.timeBreakdown.totalUsed}min</span>
                            </div>
                            <div className="summary-item">
                              <span>Buffer: {recommendations.timeBreakdown.buffer}min ({Math.round(recommendations.timeBreakdown.bufferPercentage)}%)</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Time Principles Info */}
      <div className="time-principles">
        <h4>📋 Time Design Principles</h4>
        <div className="principles-grid">
          <div className="principle-item">
            <span className="principle-icon">🗣️</span>
            <div className="principle-content">
              <div className="principle-title">Speaking Time</div>
              <div className="principle-description">Minimum 5 minutes per person in breakouts</div>
            </div>
          </div>
          <div className="principle-item">
            <span className="principle-icon">👥</span>
            <div className="principle-content">
              <div className="principle-title">Optimal Groups</div>
              <div className="principle-description">3-person breakouts for deepest dialogue</div>
            </div>
          </div>
          <div className="principle-item">
            <span className="principle-icon">⏱️</span>
            <div className="principle-content">
              <div className="principle-title">Buffer Time</div>
              <div className="principle-description">Built-in transitions and flexibility</div>
            </div>
          </div>
          <div className="principle-item">
            <span className="principle-icon">🌊</span>
            <div className="principle-content">
              <div className="principle-title">Progressive Depth</div>
              <div className="principle-description">Longer dialogues in later stages</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeGuidance;
