import React, { useState, useEffect, useCallback } from 'react';
import './CollectiveWisdomCompiler.css';

const CollectiveWisdomCompiler = ({ 
  roomSummaries = {}, 
  dialogueConfig,
  currentStage,
  onWisdomUpdate,
  isVisible = false
}) => {
  const [collectiveWisdom, setCollectiveWisdom] = useState(null);
  const [emergentThemes, setEmergentThemes] = useState([]);
  const [wisdomSynthesis, setWisdomSynthesis] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [compilationProgress, setCompilationProgress] = useState(0);
  const [wisdomMetrics, setWisdomMetrics] = useState({});
  const [editingWisdom, setEditingWisdom] = useState(false);
  const [editedSynthesis, setEditedSynthesis] = useState('');

  // Auto-compile when summaries change
  useEffect(() => {
    const summaryCount = Object.keys(roomSummaries).length;
    if (summaryCount > 0 && !isCompiling) {
      compileCollectiveWisdom();
    }
  }, [roomSummaries]);

  // Save collective wisdom to localStorage
  useEffect(() => {
    if (collectiveWisdom) {
      const wisdomKey = `collective_wisdom_${dialogueConfig?.id}`;
      localStorage.setItem(wisdomKey, JSON.stringify(collectiveWisdom));
      
      if (onWisdomUpdate) {
        onWisdomUpdate(collectiveWisdom);
      }
    }
  }, [collectiveWisdom, dialogueConfig?.id, onWisdomUpdate]);

  // Load saved collective wisdom
  useEffect(() => {
    if (dialogueConfig?.id) {
      const wisdomKey = `collective_wisdom_${dialogueConfig.id}`;
      const savedWisdom = localStorage.getItem(wisdomKey);
      if (savedWisdom) {
        try {
          const parsed = JSON.parse(savedWisdom);
          setCollectiveWisdom(parsed);
          setEmergentThemes(parsed.emergentThemes || []);
          setWisdomSynthesis(parsed.synthesis || '');
          setWisdomMetrics(parsed.metrics || {});
        } catch (error) {
          console.error('Error loading collective wisdom:', error);
        }
      }
    }
  }, [dialogueConfig?.id]);

  // Compile collective wisdom from room summaries
  const compileCollectiveWisdom = useCallback(async () => {
    if (Object.keys(roomSummaries).length === 0) return;

    setIsCompiling(true);
    setCompilationProgress(0);

    try {
      // Step 1: Extract all themes (20%)
      setCompilationProgress(20);
      const allThemes = extractAllThemes(roomSummaries);
      
      // Step 2: Identify emergent patterns (40%)
      setCompilationProgress(40);
      const emergentPatterns = identifyEmergentPatterns(roomSummaries, allThemes);
      
      // Step 3: Generate collective synthesis (60%)
      setCompilationProgress(60);
      const synthesis = await generateCollectiveSynthesis(roomSummaries, emergentPatterns);
      
      // Step 4: Calculate wisdom metrics (80%)
      setCompilationProgress(80);
      const metrics = calculateWisdomMetrics(roomSummaries, emergentPatterns);
      
      // Step 5: Compile final wisdom object (100%)
      setCompilationProgress(100);
      const wisdom = {
        id: `wisdom_${Date.now()}`,
        dialogueId: dialogueConfig?.id,
        stage: currentStage?.name,
        compiledAt: new Date().toISOString(),
        roomCount: Object.keys(roomSummaries).length,
        emergentThemes: emergentPatterns,
        synthesis,
        metrics,
        roomSummaries: Object.values(roomSummaries),
        isEdited: false
      };

      setCollectiveWisdom(wisdom);
      setEmergentThemes(emergentPatterns);
      setWisdomSynthesis(synthesis);
      setWisdomMetrics(metrics);

      // Simulate processing delay
      setTimeout(() => {
        setIsCompiling(false);
        setCompilationProgress(0);
      }, 1000);

    } catch (error) {
      console.error('Error compiling collective wisdom:', error);
      setIsCompiling(false);
      setCompilationProgress(0);
    }
  }, [roomSummaries, dialogueConfig?.id, currentStage?.name]);

  // Extract all themes from room summaries
  const extractAllThemes = (summaries) => {
    const allThemes = [];
    Object.values(summaries).forEach(summary => {
      if (summary.keyThemes) {
        allThemes.push(...summary.keyThemes);
      }
    });
    return allThemes;
  };

  // Identify emergent patterns across rooms
  const identifyEmergentPatterns = (summaries, allThemes) => {
    // Count theme frequency
    const themeFrequency = {};
    allThemes.forEach(theme => {
      const normalizedTheme = theme.toLowerCase().trim();
      themeFrequency[normalizedTheme] = (themeFrequency[normalizedTheme] || 0) + 1;
    });

    // Identify patterns that appear across multiple rooms
    const emergentPatterns = [];
    const roomCount = Object.keys(summaries).length;
    
    // Cross-room themes (appear in 2+ rooms)
    Object.entries(themeFrequency).forEach(([theme, frequency]) => {
      if (frequency >= Math.min(2, roomCount)) {
        emergentPatterns.push({
          type: 'cross-room-theme',
          theme: theme.charAt(0).toUpperCase() + theme.slice(1),
          frequency,
          prevalence: (frequency / roomCount) * 100,
          rooms: getRoomsWithTheme(summaries, theme)
        });
      }
    });

    // Stage-specific patterns
    const stagePatterns = identifyStagePatterns(summaries, currentStage?.name);
    emergentPatterns.push(...stagePatterns);

    // Conversation quality patterns
    const qualityPatterns = identifyQualityPatterns(summaries);
    emergentPatterns.push(...qualityPatterns);

    return emergentPatterns.sort((a, b) => (b.prevalence || 0) - (a.prevalence || 0));
  };

  // Get rooms that contain a specific theme
  const getRoomsWithTheme = (summaries, targetTheme) => {
    const rooms = [];
    Object.entries(summaries).forEach(([roomId, summary]) => {
      if (summary.keyThemes) {
        const hasTheme = summary.keyThemes.some(theme => 
          theme.toLowerCase().includes(targetTheme.toLowerCase())
        );
        if (hasTheme) {
          rooms.push(roomId);
        }
      }
    });
    return rooms;
  };

  // Identify stage-specific patterns
  const identifyStagePatterns = (summaries, stageName) => {
    const patterns = [];
    const summaryTexts = Object.values(summaries).map(s => s.summary || '');
    
    const stageKeywords = {
      connect: ['connection', 'trust', 'sharing', 'opening', 'welcome', 'introduction'],
      explore: ['perspective', 'different', 'explore', 'question', 'curiosity', 'discover'],
      discover: ['insight', 'wisdom', 'deeper', 'understanding', 'realization', 'breakthrough'],
      harvest: ['reflection', 'takeaway', 'learning', 'gratitude', 'completion', 'integration']
    };

    const keywords = stageKeywords[stageName] || [];
    keywords.forEach(keyword => {
      const mentionCount = summaryTexts.filter(text => 
        text.toLowerCase().includes(keyword)
      ).length;
      
      if (mentionCount >= 2) {
        patterns.push({
          type: 'stage-pattern',
          theme: `${stageName} - ${keyword}`,
          frequency: mentionCount,
          prevalence: (mentionCount / summaryTexts.length) * 100,
          stage: stageName
        });
      }
    });

    return patterns;
  };

  // Identify conversation quality patterns
  const identifyQualityPatterns = (summaries) => {
    const patterns = [];
    const summaries_array = Object.values(summaries);
    
    // High engagement pattern
    const avgTranscriptLength = summaries_array.reduce((sum, s) => 
      sum + (s.transcriptLength || 0), 0) / summaries_array.length;
    
    if (avgTranscriptLength > 10) {
      patterns.push({
        type: 'quality-pattern',
        theme: 'High Engagement',
        frequency: summaries_array.length,
        prevalence: 100,
        metric: `Average ${Math.round(avgTranscriptLength)} entries per room`
      });
    }

    // Diverse participation pattern
    const avgParticipants = summaries_array.reduce((sum, s) => 
      sum + (s.participantCount || 0), 0) / summaries_array.length;
    
    if (avgParticipants >= 2) {
      patterns.push({
        type: 'quality-pattern',
        theme: 'Diverse Participation',
        frequency: summaries_array.length,
        prevalence: 100,
        metric: `Average ${avgParticipants} participants per room`
      });
    }

    return patterns;
  };

  // Generate collective synthesis using AI
  const generateCollectiveSynthesis = async (summaries, patterns) => {
    // Mock AI synthesis based on stage and patterns
    const stageName = currentStage?.name || 'dialogue';
    const roomCount = Object.keys(summaries).length;
    const topThemes = patterns.slice(0, 3).map(p => p.theme);

    const synthesesByStage = {
      connect: [
        `Across ${roomCount} breakout conversations, a powerful foundation of trust and connection emerged. Participants consistently shared their authentic motivations for joining this dialogue, creating an atmosphere of openness and mutual respect. The recurring themes of ${topThemes.join(', ')} suggest a collective readiness to engage in meaningful exploration together.`,
        
        `The connection phase revealed a remarkable alignment in participants' intentions and values. Through ${roomCount} intimate conversations, individuals found common ground while honoring their unique perspectives. The emergence of themes around ${topThemes.join(', ')} indicates a strong foundation for deeper dialogue ahead.`,
        
        `A sense of collective purpose crystallized across all breakout rooms during the connection phase. Participants demonstrated vulnerability and authenticity in sharing their stories, creating the psychological safety necessary for generative dialogue. The consistent appearance of ${topThemes.join(', ')} across conversations suggests shared values and intentions.`
      ],
      
      explore: [
        `The exploration phase generated rich diversity of perspectives across ${roomCount} conversations. Participants demonstrated remarkable curiosity and openness to different viewpoints, with ${topThemes.join(', ')} emerging as central themes. The quality of questioning and deep listening created space for new insights to emerge organically.`,
        
        `Through ${roomCount} exploratory conversations, participants engaged in productive tension and generative disagreement. The recurring themes of ${topThemes.join(', ')} reveal the complexity and nuance of the topic at hand. Conversations moved beyond surface-level exchange to examine underlying assumptions and beliefs.`,
        
        `The exploration revealed multiple layers of understanding across all breakout rooms. Participants skillfully navigated different perspectives while building on each other's insights. The emergence of ${topThemes.join(', ')} suggests key areas where collective understanding is deepening and evolving.`
      ],
      
      discover: [
        `Profound insights emerged across ${roomCount} discovery conversations, with participants touching the deeper wisdom within their collective exploration. The themes of ${topThemes.join(', ')} represent breakthrough moments where new understanding crystallized. Conversations reached a quality of depth that surprised and moved participants.`,
        
        `The discovery phase revealed the collective intelligence of the group, with ${roomCount} conversations generating insights that transcended individual perspectives. Participants recognized patterns and connections that weren't visible before, particularly around ${topThemes.join(', ')}. A sense of collective breakthrough and shared revelation emerged.`,
        
        `Across all breakout rooms, participants experienced moments of profound recognition and insight. The consistent emergence of ${topThemes.join(', ')} suggests collective wisdom arising from the dialogue process. Conversations touched essential truths that resonated deeply with all participants involved.`
      ],
      
      harvest: [
        `The harvest phase captured the lasting impact of ${roomCount} transformative conversations. Participants articulated significant shifts in their thinking and understanding, with ${topThemes.join(', ')} representing key takeaways that will continue to influence their perspectives. A deep sense of gratitude and completion emerged across all rooms.`,
        
        `Through ${roomCount} reflective conversations, participants integrated the insights and wisdom gained throughout their dialogue journey. The themes of ${topThemes.join(', ')} represent the most significant learnings that participants will carry forward. The quality of reflection demonstrated the depth of transformation that occurred.`,
        
        `The harvest revealed the profound impact of collective dialogue, with participants across ${roomCount} rooms expressing genuine transformation in their understanding. The emergence of ${topThemes.join(', ')} as central themes suggests lasting insights that will continue to unfold beyond this dialogue experience.`
      ]
    };

    const stageOptions = synthesesByStage[stageName] || synthesesByStage.connect;
    return stageOptions[Math.floor(Math.random() * stageOptions.length)];
  };

  // Calculate wisdom metrics
  const calculateWisdomMetrics = (summaries, patterns) => {
    const summaries_array = Object.values(summaries);
    
    return {
      totalRooms: summaries_array.length,
      totalParticipants: summaries_array.reduce((sum, s) => sum + (s.participantCount || 0), 0),
      totalTranscriptEntries: summaries_array.reduce((sum, s) => sum + (s.transcriptLength || 0), 0),
      emergentThemeCount: patterns.filter(p => p.type === 'cross-room-theme').length,
      stagePatternCount: patterns.filter(p => p.type === 'stage-pattern').length,
      qualityPatternCount: patterns.filter(p => p.type === 'quality-pattern').length,
      averageRoomEngagement: summaries_array.reduce((sum, s) => sum + (s.transcriptLength || 0), 0) / summaries_array.length,
      themeConvergence: patterns.length > 0 ? patterns[0].prevalence : 0,
      wisdomDensity: (patterns.length / summaries_array.length) * 100
    };
  };

  // Handle wisdom editing
  const handleEditWisdom = () => {
    setEditingWisdom(true);
    setEditedSynthesis(wisdomSynthesis);
  };

  const handleSaveWisdom = () => {
    const updatedWisdom = {
      ...collectiveWisdom,
      synthesis: editedSynthesis,
      isEdited: true,
      editedAt: new Date().toISOString()
    };
    
    setCollectiveWisdom(updatedWisdom);
    setWisdomSynthesis(editedSynthesis);
    setEditingWisdom(false);
  };

  const handleCancelEdit = () => {
    setEditedSynthesis(wisdomSynthesis);
    setEditingWisdom(false);
  };

  // Manual recompilation
  const handleRecompile = () => {
    compileCollectiveWisdom();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="collective-wisdom-compiler">
      <div className="compiler-header">
        <h2>🌐 Collective Wisdom</h2>
        <div className="compiler-controls">
          <button 
            className="recompile-btn"
            onClick={handleRecompile}
            disabled={isCompiling || Object.keys(roomSummaries).length === 0}
          >
            {isCompiling ? '⏳ Compiling...' : '🔄 Recompile'}
          </button>
        </div>
      </div>

      {isCompiling && (
        <div className="compilation-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${compilationProgress}%` }}
            ></div>
          </div>
          <p>Compiling collective wisdom... {compilationProgress}%</p>
        </div>
      )}

      {collectiveWisdom && !isCompiling && (
        <div className="wisdom-content">
          {/* Wisdom Synthesis */}
          <div className="wisdom-synthesis">
            <div className="synthesis-header">
              <h3>✨ Collective Synthesis</h3>
              <div className="synthesis-meta">
                <span>Compiled: {new Date(collectiveWisdom.compiledAt).toLocaleString()}</span>
                {collectiveWisdom.isEdited && <span className="edited-badge">✏️ Edited</span>}
                <button className="edit-btn" onClick={handleEditWisdom}>
                  ✏️ Edit
                </button>
              </div>
            </div>
            
            {editingWisdom ? (
              <div className="synthesis-edit-mode">
                <textarea
                  value={editedSynthesis}
                  onChange={(e) => setEditedSynthesis(e.target.value)}
                  className="synthesis-textarea"
                  rows={8}
                />
                <div className="edit-actions">
                  <button className="save-btn" onClick={handleSaveWisdom}>
                    💾 Save
                  </button>
                  <button className="cancel-btn" onClick={handleCancelEdit}>
                    ❌ Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="synthesis-content">
                <p>{wisdomSynthesis}</p>
              </div>
            )}
          </div>

          {/* Emergent Themes */}
          <div className="emergent-themes">
            <h3>🎯 Emergent Themes</h3>
            <div className="themes-grid">
              {emergentThemes.map((pattern, index) => (
                <ThemeCard key={index} pattern={pattern} />
              ))}
            </div>
          </div>

          {/* Wisdom Metrics */}
          <div className="wisdom-metrics">
            <h3>📊 Collective Insights Metrics</h3>
            <WisdomMetrics metrics={wisdomMetrics} />
          </div>

          {/* Room Summaries Reference */}
          <div className="room-summaries-reference">
            <h3>🏠 Source Conversations</h3>
            <div className="summaries-grid">
              {Object.entries(roomSummaries).map(([roomId, summary]) => (
                <SummaryCard key={roomId} roomId={roomId} summary={summary} />
              ))}
            </div>
          </div>
        </div>
      )}

      {!collectiveWisdom && !isCompiling && Object.keys(roomSummaries).length === 0 && (
        <div className="no-wisdom">
          <div className="no-wisdom-content">
            <h3>🌱 Collective Wisdom Awaiting</h3>
            <p>Collective wisdom will emerge as breakout room conversations are summarized.</p>
            <p>Start recording conversations and generate AI summaries to begin the compilation process.</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Theme Card Component
const ThemeCard = ({ pattern }) => {
  const getPatternIcon = (type) => {
    switch (type) {
      case 'cross-room-theme': return '🌐';
      case 'stage-pattern': return '🎭';
      case 'quality-pattern': return '⭐';
      default: return '💡';
    }
  };

  const getPatternColor = (type) => {
    switch (type) {
      case 'cross-room-theme': return '#63b3ed';
      case 'stage-pattern': return '#48bb78';
      case 'quality-pattern': return '#ed8936';
      default: return '#a0aec0';
    }
  };

  return (
    <div className="theme-card" style={{ borderColor: getPatternColor(pattern.type) }}>
      <div className="theme-header">
        <span className="theme-icon">{getPatternIcon(pattern.type)}</span>
        <h4>{pattern.theme}</h4>
      </div>
      
      <div className="theme-stats">
        <div className="stat-item">
          <span className="stat-label">Prevalence:</span>
          <span className="stat-value">{Math.round(pattern.prevalence)}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Frequency:</span>
          <span className="stat-value">{pattern.frequency}</span>
        </div>
        {pattern.metric && (
          <div className="stat-item">
            <span className="stat-label">Metric:</span>
            <span className="stat-value">{pattern.metric}</span>
          </div>
        )}
      </div>
      
      {pattern.rooms && pattern.rooms.length > 0 && (
        <div className="theme-rooms">
          <span className="rooms-label">Rooms:</span>
          <div className="room-chips">
            {pattern.rooms.map((roomId, index) => (
              <span key={index} className="room-chip">{roomId}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Wisdom Metrics Component
const WisdomMetrics = ({ metrics }) => {
  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="metric-icon">🏠</div>
        <div className="metric-content">
          <div className="metric-value">{metrics.totalRooms}</div>
          <div className="metric-label">Breakout Rooms</div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">👥</div>
        <div className="metric-content">
          <div className="metric-value">{metrics.totalParticipants}</div>
          <div className="metric-label">Participants</div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">💬</div>
        <div className="metric-content">
          <div className="metric-value">{metrics.totalTranscriptEntries}</div>
          <div className="metric-label">Conversation Entries</div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">🎯</div>
        <div className="metric-content">
          <div className="metric-value">{metrics.emergentThemeCount}</div>
          <div className="metric-label">Emergent Themes</div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">📈</div>
        <div className="metric-content">
          <div className="metric-value">{Math.round(metrics.averageRoomEngagement)}</div>
          <div className="metric-label">Avg. Engagement</div>
        </div>
      </div>
      
      <div className="metric-card">
        <div className="metric-icon">🌟</div>
        <div className="metric-content">
          <div className="metric-value">{Math.round(metrics.wisdomDensity)}%</div>
          <div className="metric-label">Wisdom Density</div>
        </div>
      </div>
    </div>
  );
};

// Summary Card Component
const SummaryCard = ({ roomId, summary }) => {
  return (
    <div className="summary-card">
      <div className="summary-header">
        <h4>{roomId}</h4>
        <div className="summary-meta">
          <span>👥 {summary.participantCount}</span>
          <span>💬 {summary.transcriptLength}</span>
        </div>
      </div>
      
      <div className="summary-content">
        <p>{summary.summary}</p>
      </div>
      
      {summary.keyThemes && summary.keyThemes.length > 0 && (
        <div className="summary-themes">
          {summary.keyThemes.slice(0, 3).map((theme, index) => (
            <span key={index} className="theme-tag">{theme}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default CollectiveWisdomCompiler;
