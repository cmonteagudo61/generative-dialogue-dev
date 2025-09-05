import React, { useState, useEffect } from 'react';
import DialogueSetup from './DialogueSetup';
import DialoguePreview from './DialoguePreview';
import SessionOrchestrator from './SessionOrchestrator';
import ScalableSessionOrchestrator from './ScalableSessionOrchestrator';
import CloudStorageSetup from './CloudStorageSetup';
import cloudStorage from '../services/cloudStorage';
import './DialogueManager.css';

const DialogueManager = ({ onDialogueSelect, currentDialogue }) => {
  const [dialogues, setDialogues] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedDialogue, setSelectedDialogue] = useState(null);
  const [editingDialogue, setEditingDialogue] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showPreview, setShowPreview] = useState(false);
  const [previewDialogue, setPreviewDialogue] = useState(null);
  const [showLiveSession, setShowLiveSession] = useState(false);
  const [liveDialogue, setLiveDialogue] = useState(null);
  const [sessionParticipants, setSessionParticipants] = useState([]);
  const [showScalableSession, setShowScalableSession] = useState(false);
  const [scalableParticipants, setScalableParticipants] = useState([]);
  const [showCloudSetup, setShowCloudSetup] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(null);
  const [isRealtimeUpdate, setIsRealtimeUpdate] = useState(false);

  // Initialize cloud storage and load dialogues
  useEffect(() => {
    const initializeStorage = async () => {
      console.log('🚀 DialogueManager: Starting cloud storage initialization...');
      
      // Initialize cloud storage (will auto-load config from localStorage)
      const success = await cloudStorage.initialize();
      console.log('🚀 DialogueManager: Cloud storage initialization result:', success);
      
      const status = cloudStorage.getStatus();
      console.log('🚀 DialogueManager: Cloud storage status:', status);
      setCloudStatus(status);
      
      // Load dialogues from cloud/local storage
      const loadedDialogues = await cloudStorage.loadDialogues();
      console.log('🚀 DialogueManager: Loaded dialogues:', loadedDialogues.length);
      
      // Migrate dialogues to ensure all stages have enabled property
      const migratedDialogues = loadedDialogues.map(dialogue => {
        if (!dialogue.stages) return dialogue;
        
        const migratedStages = {};
        Object.entries(dialogue.stages).forEach(([stageKey, stage]) => {
          migratedStages[stageKey] = {
            ...stage,
            // Ensure enabled property exists - default to true for existing dialogues
            enabled: stage.enabled !== undefined ? stage.enabled : true
          };
        });
        
        return {
          ...dialogue,
          stages: migratedStages
        };
      });
      
      // Save migrated dialogues if any changes were made
      const needsMigration = migratedDialogues.some((dialogue, index) => 
        JSON.stringify(dialogue.stages) !== JSON.stringify(loadedDialogues[index]?.stages)
      );
      
      if (needsMigration) {
        console.log('🔄 DialogueManager: Migrating dialogues to add missing enabled properties');
        await cloudStorage.saveDialogues(migratedDialogues);
      }
      
      setDialogues(migratedDialogues);
      
      // Set up real-time sync if available
      if (status.isOnline) {
        const unsubscribe = cloudStorage.setupRealtimeSync((updatedDialogues) => {
          console.log('🚀 DialogueManager: Real-time sync update received:', updatedDialogues.length);
          setIsRealtimeUpdate(true);
          setDialogues(updatedDialogues);
          // Reset flag after a brief delay
          setTimeout(() => setIsRealtimeUpdate(false), 100);
        });
        
        // Cleanup function
        return () => {
          if (unsubscribe) {
            unsubscribe();
          }
        };
      }
    };
    
    initializeStorage();
  }, []);

  // Save dialogues to cloud/local storage whenever dialogues change (but not from real-time updates)
  useEffect(() => {
    if (!isRealtimeUpdate && (dialogues.length > 0 || cloudStatus?.isInitialized)) {
      console.log('💾 Saving dialogues to cloud (user-initiated change)');
      cloudStorage.saveDialogues(dialogues);
    } else if (isRealtimeUpdate) {
      console.log('🔄 Skipping save (real-time update)');
    }
  }, [dialogues, cloudStatus, isRealtimeUpdate]);

  const handleDialogueCreate = (config) => {
    const newDialogue = {
      ...config,
      status: 'draft',
      participants: [],
      sessions: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    setDialogues(prev => [...prev, newDialogue]);
    setShowSetup(false);
    setSelectedDialogue(newDialogue);
  };

  const handleDialogueEdit = (dialogue) => {
    setEditingDialogue(dialogue);
    setShowSetup(true);
  };

  const handleDialogueUpdate = (updatedConfig) => {
    console.log('🔄 DialogueManager: Received update for dialogue:', updatedConfig.id);
    console.log('🔄 DialogueManager: New duration:', updatedConfig.totalDuration, 'minutes');
    
    const updatedDialogue = {
      ...updatedConfig,
      lastModified: new Date().toISOString()
    };
    
    setDialogues(prev => {
      const newDialogues = prev.map(d => 
        d.id === updatedDialogue.id ? updatedDialogue : d
      );
      console.log('🔄 DialogueManager: Updated dialogues list');
      return newDialogues;
    });
    
    setShowSetup(false);
    setEditingDialogue(null);
    setSelectedDialogue(updatedDialogue);
  };

  // Import/Export functions for cross-device synchronization
  const handleExportDialogues = () => {
    const exportData = {
      dialogues: dialogues,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `generative-dialogues-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportDialogues = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        
        // Handle both old format (direct array) and new format (with metadata)
        const importedDialogues = importedData.dialogues || importedData;
        
        // Validate the imported data
        if (!Array.isArray(importedDialogues)) {
          alert('Invalid file format. Please select a valid dialogue export file.');
          return;
        }

        // Merge with existing dialogues, avoiding duplicates
        const existingIds = new Set(dialogues.map(d => d.id));
        const newDialogues = importedDialogues.filter(d => !existingIds.has(d.id));
        
        if (newDialogues.length === 0) {
          alert('No new dialogues found in the import file. All dialogues already exist.');
          return;
        }

        setDialogues(prev => [...prev, ...newDialogues]);
        alert(`Successfully imported ${newDialogues.length} dialogue(s).`);
        
      } catch (error) {
        console.error('Error importing dialogues:', error);
        alert('Error importing dialogues. Please check the file format.');
      }
    };
    
    reader.readAsText(file);
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handleDialogueStart = (dialogue) => {
    const updatedDialogue = {
      ...dialogue,
      status: 'active',
      startedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    setDialogues(prev => prev.map(d => 
      d.id === dialogue.id ? updatedDialogue : d
    ));
    
    onDialogueSelect(updatedDialogue);
  };

  const handleDialogueEnd = (dialogue) => {
    const updatedDialogue = {
      ...dialogue,
      status: 'completed',
      endedAt: new Date().toISOString(),
      lastModified: new Date().toISOString()
    };
    
    setDialogues(prev => prev.map(d => 
      d.id === dialogue.id ? updatedDialogue : d
    ));
  };

  const handleDialogueDelete = (dialogueId) => {
    if (window.confirm('Are you sure you want to delete this dialogue? This action cannot be undone.')) {
      setDialogues(prev => prev.filter(d => d.id !== dialogueId));
      if (selectedDialogue?.id === dialogueId) {
        setSelectedDialogue(null);
      }
    }
  };

  const handleDialogueDuplicate = (dialogue) => {
    const duplicated = {
      ...dialogue,
      id: `dialogue_${Date.now()}`,
      title: `${dialogue.title} (Copy)`,
      status: 'draft',
      participants: [],
      sessions: [],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      startedAt: null,
      endedAt: null
    };
    
    setDialogues(prev => [...prev, duplicated]);
  };

  const handleDialoguePreview = (dialogue) => {
    setPreviewDialogue(dialogue);
    setShowPreview(true);
  };

  const handleStartLiveSession = (dialogue) => {
    // Generate mock participants for demo
    const mockParticipants = Array.from({ length: dialogue.gatheringSize || 6 }, (_, i) => ({
      id: `participant_${i}`,
      name: `Participant ${i + 1}`,
      status: 'ready'
    }));
    
    setLiveDialogue(dialogue);
    setSessionParticipants(mockParticipants);
    setShowLiveSession(true);
  };

  const handleSessionEnd = (sessionData) => {
    console.log('Session ended:', sessionData);
    setShowLiveSession(false);
    setLiveDialogue(null);
    setSessionParticipants([]);
  };

  const handleStartScalableSession = (dialogue, participantCount = 100) => {
    // Generate mock participants for scale testing
    const mockParticipants = Array.from({ length: participantCount }, (_, i) => ({
      id: `participant_${i}`,
      name: `Participant ${i + 1}`,
      email: `participant${i + 1}@example.com`,
      status: 'ready',
      demographics: {
        region: ['North America', 'Europe', 'Asia', 'South America', 'Africa'][Math.floor(Math.random() * 5)],
        experience: ['Beginner', 'Intermediate', 'Advanced'][Math.floor(Math.random() * 3)],
        interest: ['Environment', 'Technology', 'Social Justice', 'Education', 'Healthcare'][Math.floor(Math.random() * 5)]
      }
    }));
    
    setLiveDialogue(dialogue);
    setScalableParticipants(mockParticipants);
    setShowScalableSession(true);
  };

  const handleScalableSessionEnd = () => {
    setShowScalableSession(false);
    setLiveDialogue(null);
    setScalableParticipants([]);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return '#718096';
      case 'active': return '#48bb78';
      case 'completed': return '#63b3ed';
      case 'archived': return '#a0aec0';
      default: return '#718096';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return '📝';
      case 'active': return '🟢';
      case 'completed': return '✅';
      case 'archived': return '📦';
      default: return '📝';
    }
  };

  const formatDuration = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate accurate duration excluding harvest
  const calculateActualDuration = (dialogue) => {
    if (!dialogue?.stages) return dialogue.totalDuration || 0;
    
    let total = 0;
    Object.entries(dialogue.stages).forEach(([stageKey, stage]) => {
      if (stage.enabled && stage.substages) {
        // Exclude harvest from committed dialogue time - it's post-dialogue
        if (stageKey === 'harvest') return;
        
        stage.substages.forEach(substage => {
          total += parseInt(substage.duration) || 0;
        });
      }
    });
    
    // Only log duration mismatches in development
    if (process.env.NODE_ENV === 'development' && Math.abs(dialogue.totalDuration - total) > 5) {
      console.log(`📊 Duration mismatch for "${dialogue.title}": Stored ${dialogue.totalDuration}min, Calculated ${total}min`);
    }
    return total;
  };

  const renderDialogueCard = (dialogue) => (
    <div key={dialogue.id} className="dialogue-card">
      <div className="card-header">
        <div className="card-title">
          <span className="status-icon">{getStatusIcon(dialogue.status)}</span>
          <h3>{dialogue.title}</h3>
        </div>
        <div className="card-actions">
          <button
            className="action-btn"
            onClick={() => setSelectedDialogue(dialogue)}
            title="View Details"
          >
            👁️
          </button>
          <button
            className="action-btn"
            onClick={() => handleDialogueEdit(dialogue)}
            title="Edit Configuration"
          >
            ✏️
          </button>
          <button
            className="action-btn"
            onClick={() => handleDialoguePreview(dialogue)}
            title="Participant Preview"
          >
            📖
          </button>
          <button
            className="action-btn"
            onClick={() => handleDialogueDuplicate(dialogue)}
            title="Duplicate"
          >
            📋
          </button>
          <button
            className="action-btn delete"
            onClick={() => handleDialogueDelete(dialogue.id)}
            title="Delete"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="card-content">
        <p className="description">{dialogue.description || 'No description provided'}</p>
        
        <div className="card-stats">
          <div className="stat">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{formatDuration(calculateActualDuration(dialogue))}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Participants:</span>
            <span className="stat-value">{dialogue.gatheringSize || dialogue.maxParticipants}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Target Time:</span>
            <span className="stat-value">{dialogue.availableTime ? `${dialogue.availableTime}min` : 'Not set'}</span>
          </div>
        </div>

        <div className="card-meta">
          <span className="created-date">Created {formatDate(dialogue.createdAt)}</span>
          <span 
            className="status-badge" 
            style={{ backgroundColor: getStatusColor(dialogue.status) }}
          >
            {dialogue.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="card-footer">
        {dialogue.status === 'draft' && (
          <div className="draft-controls">
            <button
              className="btn-secondary"
              onClick={() => handleDialogueStart(dialogue)}
            >
              Start Dialogue
            </button>
            <button
              className="btn-primary live-session-btn"
              onClick={() => handleStartLiveSession(dialogue)}
            >
              🎬 Live Session
            </button>
            <button
              className="btn-enterprise scale-test-btn"
              onClick={() => handleStartScalableSession(dialogue, 100)}
              title="Test with 100 participants"
            >
              🌐 Scale Test (100)
            </button>
          </div>
        )}
        {dialogue.status === 'active' && (
          <div className="active-controls">
            <button
              className="btn-secondary"
              onClick={() => onDialogueSelect(dialogue)}
            >
              Continue
            </button>
            <button
              className="btn-danger"
              onClick={() => handleDialogueEnd(dialogue)}
            >
              End Dialogue
            </button>
          </div>
        )}
        {dialogue.status === 'completed' && (
          <button
            className="btn-secondary"
            onClick={() => onDialogueSelect(dialogue)}
          >
            View Results
          </button>
        )}
      </div>
    </div>
  );

  const renderDialogueList = (dialogue) => (
    <div key={dialogue.id} className="dialogue-list-item">
      <div className="list-main">
        <div className="list-title">
          <span className="status-icon">{getStatusIcon(dialogue.status)}</span>
          <h4>{dialogue.title}</h4>
          <span 
            className="status-badge small" 
            style={{ backgroundColor: getStatusColor(dialogue.status) }}
          >
            {dialogue.status}
          </span>
        </div>
        <p className="list-description">{dialogue.description || 'No description'}</p>
      </div>
      
      <div className="list-stats">
        <span>{formatDuration(calculateActualDuration(dialogue))}</span>
        <span>{dialogue.gatheringSize || dialogue.maxParticipants} people</span>
        <span>{dialogue.availableTime ? `${dialogue.availableTime}min target` : 'No target'}</span>
      </div>
      
      <div className="list-actions">
        <button
          className="action-btn"
          onClick={() => setSelectedDialogue(dialogue)}
        >
          View
        </button>
        <button
          className="action-btn"
          onClick={() => handleDialogueEdit(dialogue)}
          title="Edit"
        >
          ✏️
        </button>
        <button
          className="action-btn"
          onClick={() => handleDialoguePreview(dialogue)}
          title="Participant Preview"
        >
          📖
        </button>
        {dialogue.status === 'draft' && (
          <>
            <button
              className="btn-secondary small"
              onClick={() => handleDialogueStart(dialogue)}
            >
              Start
            </button>
            <button
              className="btn-primary small live-session-btn"
              onClick={() => handleStartLiveSession(dialogue)}
              title="Start Live Session"
            >
              🎬 Live
            </button>
            <button
              className="btn-enterprise small scale-test-btn"
              onClick={() => handleStartScalableSession(dialogue, 100)}
              title="Scale Test with 100 participants"
            >
              🌐 Scale
            </button>
          </>
        )}
        {dialogue.status === 'active' && (
          <button
            className="btn-secondary small"
            onClick={() => onDialogueSelect(dialogue)}
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="dialogue-manager">
      <div className="manager-header">
        <div className="header-left">
          <h2>🎭 Dialogue Manager</h2>
          <p>Create, configure, and manage your generative dialogues</p>
        </div>
        
        <div className="header-actions">
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
          
          <div className="sync-controls">
            <button
              className={`btn-secondary ${cloudStatus?.isOnline ? 'cloud-online' : 'cloud-offline'}`}
              onClick={() => setShowCloudSetup(true)}
              title={cloudStatus?.isOnline ? 'Cloud storage active' : 'Setup cloud storage'}
            >
              {cloudStatus?.isOnline ? '☁️ Cloud' : '📱 Local'}
            </button>
            <input
              type="file"
              accept=".json"
              onChange={handleImportDialogues}
              style={{ display: 'none' }}
              id="import-dialogues"
            />
            <button
              className="btn-secondary"
              onClick={() => document.getElementById('import-dialogues').click()}
              title="Import dialogues from another device"
            >
              📥 Import
            </button>
            <button
              className="btn-secondary"
              onClick={handleExportDialogues}
              title="Export dialogues to share with another device"
              disabled={dialogues.length === 0}
            >
              📤 Export
            </button>
          </div>
          
          <button
            className="btn-primary"
            onClick={() => setShowSetup(true)}
          >
            + New Dialogue
          </button>
        </div>
      </div>

      <div className="manager-content">
        {dialogues.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎭</div>
            <h3>No Dialogues Yet</h3>
            <p>Create your first generative dialogue to get started</p>
            <button
              className="btn-primary"
              onClick={() => setShowSetup(true)}
            >
              Create First Dialogue
            </button>
          </div>
        ) : (
          <div className={`dialogues-container ${viewMode}`}>
            {viewMode === 'grid' 
              ? dialogues.map(renderDialogueCard)
              : dialogues.map(renderDialogueList)
            }
          </div>
        )}
      </div>

      {showSetup && (
        <DialogueSetup
          onDialogueCreate={editingDialogue ? handleDialogueUpdate : handleDialogueCreate}
          onClose={() => {
            setShowSetup(false);
            setEditingDialogue(null);
          }}
          editingDialogue={editingDialogue}
        />
      )}

      {selectedDialogue && (
        <div className="dialogue-detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{selectedDialogue.title}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedDialogue(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="detail-section">
                <h4>Configuration</h4>
                <div className="config-grid">
                  <div className="config-item">
                    <label>Duration:</label>
                    <span>{formatDuration(calculateActualDuration(selectedDialogue))}</span>
                  </div>
                  <div className="config-item">
                    <label>Participants:</label>
                    <span>{selectedDialogue.gatheringSize || selectedDialogue.maxParticipants}</span>
                  </div>
                  <div className="config-item">
                    <label>Target Time:</label>
                    <span>{selectedDialogue.availableTime ? `${selectedDialogue.availableTime} min` : 'Not set'}</span>
                  </div>
                  <div className="config-item">
                    <label>Status:</label>
                    <span className="status-badge" style={{ backgroundColor: getStatusColor(selectedDialogue.status) }}>
                      {selectedDialogue.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Dialogue Structure</h4>
                
                {/* Synchronous Stages */}
                <div className="stages-group">
                  <div className="stages-group-header">
                    <span className="group-title">🤝 Synchronous Activity</span>
                    <span className="group-subtitle">Group time - all participants together</span>
                  </div>
                  <div className="stages-list">
                    {Object.entries(selectedDialogue.stages)
                      .filter(([stageKey, settings]) => settings.enabled && stageKey !== 'harvest')
                      .map(([stage, settings]) => {
                        // Calculate total duration for this stage
                        const stageDuration = settings.substages 
                          ? settings.substages.reduce((sum, substage) => sum + (parseInt(substage.duration) || 0), 0)
                          : (parseInt(settings.duration) || 0);
                        
                        return (
                          <div key={stage} className="stage-item">
                            <span className="stage-name">{stage.toUpperCase()}</span>
                            <span className="stage-duration">{stageDuration}m</span>
                          </div>
                        );
                      })
                    }
                  </div>
                  <div className="stages-subtotal">
                    <span className="subtotal-label">Committed Group Time:</span>
                    <span className="subtotal-value">{formatDuration(calculateActualDuration(selectedDialogue))}</span>
                  </div>
                </div>

                {/* Asynchronous Stages */}
                {selectedDialogue.stages.harvest?.enabled && (
                  <div className="stages-group async">
                    <div className="stages-group-header">
                      <span className="group-title">🏠 Asynchronous Activity</span>
                      <span className="group-subtitle">Individual time - completed on own schedule</span>
                    </div>
                    <div className="stages-list">
                      <div className="stage-item">
                        <span className="stage-name">HARVEST</span>
                        <span className="stage-duration">
                          {selectedDialogue.stages.harvest.substages 
                            ? selectedDialogue.stages.harvest.substages.reduce((sum, substage) => sum + (parseInt(substage.duration) || 0), 0)
                            : 0}m
                        </span>
                      </div>
                    </div>
                    <div className="stages-subtotal async">
                      <span className="subtotal-label">Individual Commitment:</span>
                      <span className="subtotal-value">
                        {formatDuration(selectedDialogue.stages.harvest.substages 
                          ? selectedDialogue.stages.harvest.substages.reduce((sum, substage) => sum + (parseInt(substage.duration) || 0), 0)
                          : 0)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h4>AI Services</h4>
                <div className="services-list">
                  {Object.entries(selectedDialogue.aiSettings)
                    .filter(([_, settings]) => settings.enabled)
                    .map(([service, settings]) => (
                      <div key={service} className="service-item">
                        <span className="service-name">{service}</span>
                        <span className="service-provider">{settings.provider}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedDialogue(null)}
              >
                Close
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  handleDialogueEdit(selectedDialogue);
                  setSelectedDialogue(null);
                }}
              >
                ✏️ Edit Configuration
              </button>
              {selectedDialogue.status === 'draft' && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    handleDialogueStart(selectedDialogue);
                    setSelectedDialogue(null);
                  }}
                >
                  Start Dialogue
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dialogue Preview Modal */}
      {showPreview && previewDialogue && (
        <div className="preview-modal-overlay">
          <div className="preview-modal">
            <div className="preview-modal-header">
              <h3>📖 Participant Preview</h3>
              <button
                className="close-btn"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewDialogue(null);
                }}
              >
                ×
              </button>
            </div>
            <div className="preview-modal-content">
              <DialoguePreview 
                dialogueConfig={previewDialogue} 
                isParticipantView={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Session Orchestrator */}
      {showLiveSession && liveDialogue && (
        <div className="live-session-overlay">
          <SessionOrchestrator
            dialogueConfig={liveDialogue}
            participants={sessionParticipants}
            isHost={true}
            onSessionEnd={handleSessionEnd}
            onParticipantUpdate={setSessionParticipants}
          />
        </div>
      )}

      {/* Scalable Session Orchestrator */}
      {showScalableSession && liveDialogue && (
        <div className="scalable-session-overlay">
          <ScalableSessionOrchestrator
            dialogueConfig={liveDialogue}
            participants={scalableParticipants}
            facilitatorRole="master"
            facilitatorId="master_001"
            onSessionUpdate={handleScalableSessionEnd}
          />
        </div>
      )}

      {showCloudSetup && (
        <CloudStorageSetup
          onClose={() => {
            setShowCloudSetup(false);
            setCloudStatus(cloudStorage.getStatus());
          }}
        />
      )}
    </div>
  );
};

export default DialogueManager;
