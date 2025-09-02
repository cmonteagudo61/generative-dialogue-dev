import React, { useState, useEffect } from 'react';
import './DialoguePreview.css';

const DialoguePreview = ({ dialogueConfig, isParticipantView = false }) => {
  // eslint-disable-next-line no-unused-vars
  const [expandedStage, setExpandedStage] = useState(null);
  const [catalystLibrary, setCatalystLibrary] = useState({});

  // Load catalyst library to resolve catalyst references
  useEffect(() => {
    const saved = localStorage.getItem('catalyst_library');
    if (saved) {
      try {
        setCatalystLibrary(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading catalyst library:', error);
      }
    }
  }, []);

  if (!dialogueConfig) {
    return (
      <div className="dialogue-preview">
        <div className="preview-placeholder">
          <div className="placeholder-icon">🎭</div>
          <h3>No Dialogue Selected</h3>
          <p>Select a dialogue to see the participant preview</p>
        </div>
      </div>
    );
  }

  // Helper functions
  const formatDuration = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  // eslint-disable-next-line no-unused-vars
  const formatDate = (dateString) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateTotalDuration = () => {
    let total = 0;
    Object.values(dialogueConfig.stages || {}).forEach(stage => {
      if (stage.enabled && stage.substages) {
        stage.substages.forEach(substage => {
          total += substage.duration || 0;
        });
      }
    });
    return total;
  };

  const getBreakoutSizeDescription = (viewMode) => {
    const descriptions = {
      'community': 'Full group discussion',
      'individual': 'Personal reflection',
      'dyad': 'Pairs (2 people)',
      'triad': 'Small groups (3 people)',
      'quad': 'Groups of 4',
      'breakout-processing': 'Individual work with AI support'
    };
    return descriptions[viewMode] || viewMode;
  };

  const getStageDescription = (stageName) => {
    const descriptions = {
      opening: 'Welcome, introductions, and setting the container for dialogue',
      connect: 'Initial sharing and connection - exploring what brought you here',
      explore: 'Deeper inquiry into emerging themes and questions',
      discover: 'Opening to collective wisdom and new possibilities',
      harvest: 'Integration, reflection, and taking insights forward'
    };
    return descriptions[stageName] || '';
  };

  const getStageIcon = (stageName) => {
    const icons = {
      opening: '🌅',
      connect: '🤝',
      explore: '🔍',
      discover: '✨',
      harvest: '🌾'
    };
    return icons[stageName] || '📍';
  };

  const getCatalystInfo = (catalystContent) => {
    if (!catalystContent || !catalystLibrary) return null;

    // Search through all categories for the catalyst
    for (const category of Object.values(catalystLibrary)) {
      if (Array.isArray(category)) {
        const catalyst = category.find(c => c.id === catalystContent);
        if (catalyst) return catalyst;
      }
    }
    return null;
  };

  const getDiversityDescription = (level) => {
    const descriptions = {
      'homogeneous': 'Similar backgrounds and perspectives',
      'somewhat-diverse': 'Some variety in backgrounds',
      'moderately-diverse': 'Good mix of different perspectives',
      'diverse': 'Wide range of backgrounds and viewpoints',
      'highly-diverse': 'Very diverse group with many different perspectives'
    };
    return descriptions[level] || level;
  };

  const getFamiliarityDescription = (level) => {
    const descriptions = {
      'strangers': 'Participants don\'t know each other',
      'acquaintances': 'Some participants may have met before',
      'colleagues': 'Professional relationships',
      'friends': 'Personal relationships and friendships'
    };
    return descriptions[level] || level;
  };

  const getExperienceDescription = (level) => {
    const descriptions = {
      'none': 'New to generative dialogue',
      'beginner': 'Some experience with dialogue processes',
      'intermediate': 'Comfortable with dialogue practices',
      'advanced': 'Experienced dialogue participants',
      'expert': 'Deep experience with generative dialogue'
    };
    return descriptions[level] || level;
  };

  const enabledStages = Object.entries(dialogueConfig.stages || {})
    .filter(([_, stage]) => stage.enabled)
    .map(([name, stage]) => ({ name, ...stage }));

  return (
    <div className={`dialogue-preview ${isParticipantView ? 'participant-view' : ''}`}>
      {/* Header */}
      <div className="preview-header">
        <div className="header-content">
          <div className="dialogue-title-section">
            <h1 className="dialogue-title">{dialogueConfig.title}</h1>
            {dialogueConfig.description && (
              <p className="dialogue-description">{dialogueConfig.description}</p>
            )}
          </div>
          
          <div className="dialogue-meta">
            <div className="meta-item">
              <span className="meta-icon">⏰</span>
              <span className="meta-value">{formatDuration(calculateTotalDuration())}</span>
              <span className="meta-label">Total Duration</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">👥</span>
              <span className="meta-value">{dialogueConfig.gatheringSize || dialogueConfig.maxParticipants}</span>
              <span className="meta-label">Participants</span>
            </div>
            <div className="meta-item">
              <span className="meta-icon">📍</span>
              <span className="meta-value">{enabledStages.length}</span>
              <span className="meta-label">Stages</span>
            </div>
          </div>
        </div>
      </div>

      {/* Context Information */}
      {(dialogueConfig.theme || dialogueConfig.context || dialogueConfig.host) && (
        <div className="context-section">
          <h2>📋 Dialogue Context</h2>
          <div className="context-grid">
            {dialogueConfig.host && (
              <div className="context-item">
                <div className="context-label">Host</div>
                <div className="context-value">{dialogueConfig.host}</div>
              </div>
            )}
            
            {dialogueConfig.theme && (
              <div className="context-item full-width">
                <div className="context-label">Theme/Issue Being Explored</div>
                <div className="context-value">{dialogueConfig.theme}</div>
              </div>
            )}
            
            {dialogueConfig.context && (
              <div className="context-item full-width">
                <div className="context-label">Context/Field</div>
                <div className="context-value">{dialogueConfig.context}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Group Characteristics */}
      {(dialogueConfig.diversity || dialogueConfig.familiarity || dialogueConfig.experience) && (
        <div className="characteristics-section">
          <h2>👥 Group Characteristics</h2>
          <div className="characteristics-grid">
            {dialogueConfig.diversity && (
              <div className="characteristic-item">
                <div className="characteristic-icon">🌈</div>
                <div className="characteristic-content">
                  <div className="characteristic-label">Diversity</div>
                  <div className="characteristic-value">{getDiversityDescription(dialogueConfig.diversity)}</div>
                </div>
              </div>
            )}
            
            {dialogueConfig.familiarity && (
              <div className="characteristic-item">
                <div className="characteristic-icon">🤝</div>
                <div className="characteristic-content">
                  <div className="characteristic-label">Familiarity</div>
                  <div className="characteristic-value">{getFamiliarityDescription(dialogueConfig.familiarity)}</div>
                </div>
              </div>
            )}
            
            {dialogueConfig.experience && (
              <div className="characteristic-item">
                <div className="characteristic-icon">🎯</div>
                <div className="characteristic-content">
                  <div className="characteristic-label">Experience Level</div>
                  <div className="characteristic-value">{getExperienceDescription(dialogueConfig.experience)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Journey Timeline */}
      <div className="journey-section">
        <h2>🗺️ Your Dialogue Journey</h2>
        <p className="journey-description">
          This dialogue follows a carefully designed arc that will take you from initial connection 
          through deep exploration to collective discovery and personal harvest.
        </p>
        
        <div className="stages-timeline">
          {enabledStages.map((stage, index) => (
            <div key={stage.name} className="stage-timeline-item">
              <div className="stage-connector">
                <div className="stage-number">{index + 1}</div>
                {index < enabledStages.length - 1 && <div className="connector-line"></div>}
              </div>
              
              <div className="stage-card">
                <div className="stage-header">
                  <div className="stage-title">
                    <span className="stage-icon">{getStageIcon(stage.name)}</span>
                    <h3>{stage.name.charAt(0).toUpperCase() + stage.name.slice(1)}</h3>
                  </div>
                  <div className="stage-duration">
                    {formatDuration(stage.substages?.reduce((sum, sub) => sum + (sub.duration || 0), 0) || 0)}
                  </div>
                </div>
                
                <p className="stage-description">{getStageDescription(stage.name)}</p>
                
                <div className="substages">
                  {stage.substages?.map((substage, subIndex) => (
                    <div key={subIndex} className="substage-item">
                      <div className="substage-header">
                        <span className="substage-name">
                          {substage.name === 'Catalyst' && '✨'}
                          {substage.name === 'Dialogue' && '💬'}
                          {substage.name === 'Summary' && '📝'}
                          {substage.name === 'WE' && '🌐'}
                          {substage.name === 'Individual Reflection' && '🤔'}
                          {substage.name === 'Harvest Sharing' && '🌾'}
                          {substage.name === 'Technical Setup & Welcome' && '🌅'}
                          {' '}
                          {substage.name}
                        </span>
                        <span className="substage-duration">{formatDuration(substage.duration || 0)}</span>
                      </div>
                      
                      <div className="substage-details">
                        <div className="substage-format">
                          {getBreakoutSizeDescription(substage.viewMode)}
                        </div>
                        
                        {substage.prompt && (
                          <div className="substage-prompt">"{substage.prompt}"</div>
                        )}
                        
                        {substage.catalystContent && (
                          <div className="catalyst-preview">
                            {(() => {
                              const catalyst = getCatalystInfo(substage.catalystContent);
                              return catalyst ? (
                                <div className="catalyst-info">
                                  <div className="catalyst-header">
                                    <span className="catalyst-title">📜 {catalyst.title}</span>
                                    {catalyst.author && <span className="catalyst-author">by {catalyst.author}</span>}
                                  </div>
                                  <div className="catalyst-preview-text">
                                    {catalyst.content.length > 100 
                                      ? `${catalyst.content.substring(0, 100)}...`
                                      : catalyst.content
                                    }
                                  </div>
                                  {catalyst.tags && catalyst.tags.length > 0 && (
                                    <div className="catalyst-tags">
                                      {catalyst.tags.map(tag => (
                                        <span key={tag} className="catalyst-tag">{tag}</span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="catalyst-placeholder">
                                  Catalyst content will be shared during the dialogue
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Participation Guidelines */}
      <div className="guidelines-section">
        <h2>📖 Participation Guidelines</h2>
        <div className="guidelines-grid">
          <div className="guideline-item">
            <div className="guideline-icon">🎤</div>
            <div className="guideline-content">
              <h4>Speaking & Listening</h4>
              <p>Share authentically and listen deeply. Each person will have dedicated time to speak and be heard.</p>
            </div>
          </div>
          
          <div className="guideline-item">
            <div className="guideline-icon">🤝</div>
            <div className="guideline-content">
              <h4>Breakout Groups</h4>
              <p>You'll be in different small group configurations throughout the dialogue, allowing for intimate sharing and diverse perspectives.</p>
            </div>
          </div>
          
          <div className="guideline-item">
            <div className="guideline-icon">🌱</div>
            <div className="guideline-content">
              <h4>Emergence</h4>
              <p>Stay curious about what wants to emerge. The dialogue is designed to surface collective wisdom and new insights.</p>
            </div>
          </div>
          
          <div className="guideline-item">
            <div className="guideline-icon">💻</div>
            <div className="guideline-content">
              <h4>Technical Setup</h4>
              <p>Ensure you have a stable internet connection, working camera and microphone, and a quiet space for focused dialogue.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="preview-footer">
        <div className="footer-content">
          <div className="footer-message">
            <h3>Ready to Begin?</h3>
            <p>This dialogue has been thoughtfully designed to create a meaningful experience for all participants. 
               Come with curiosity, openness, and whatever is alive in you today.</p>
          </div>
          
          {dialogueConfig.facilitator && (
            <div className="facilitator-info">
              <span className="facilitator-label">Facilitated by:</span>
              <span className="facilitator-name">{dialogueConfig.facilitator}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DialoguePreview;
