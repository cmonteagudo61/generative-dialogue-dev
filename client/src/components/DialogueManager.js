import React, { useState, useEffect } from 'react';
import DialogueSetup from './DialogueSetup';
import './DialogueManager.css';

const DialogueManager = ({ onDialogueSelect, currentDialogue }) => {
  const [dialogues, setDialogues] = useState([]);
  const [showSetup, setShowSetup] = useState(false);
  const [selectedDialogue, setSelectedDialogue] = useState(null);
  const [editingDialogue, setEditingDialogue] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  // Load dialogues from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('generative_dialogues');
    if (saved) {
      try {
        setDialogues(JSON.parse(saved));
      } catch (error) {
        console.error('Error loading dialogues:', error);
      }
    }
  }, []);

  // Save dialogues to localStorage whenever dialogues change
  useEffect(() => {
    localStorage.setItem('generative_dialogues', JSON.stringify(dialogues));
  }, [dialogues]);

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
    const updatedDialogue = {
      ...updatedConfig,
      lastModified: new Date().toISOString()
    };
    
    setDialogues(prev => prev.map(d => 
      d.id === updatedDialogue.id ? updatedDialogue : d
    ));
    
    setShowSetup(false);
    setEditingDialogue(null);
    setSelectedDialogue(updatedDialogue);
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
            <span className="stat-value">{formatDuration(dialogue.totalDuration)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Max Participants:</span>
            <span className="stat-value">{dialogue.maxParticipants}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Stages:</span>
            <span className="stat-value">
              {Object.values(dialogue.stages).filter(s => s.enabled).length}
            </span>
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
          <button
            className="btn-primary"
            onClick={() => handleDialogueStart(dialogue)}
          >
            Start Dialogue
          </button>
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
        <span>{formatDuration(dialogue.totalDuration)}</span>
        <span>{dialogue.maxParticipants} max</span>
        <span>{Object.values(dialogue.stages).filter(s => s.enabled).length} stages</span>
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
        {dialogue.status === 'draft' && (
          <button
            className="btn-primary small"
            onClick={() => handleDialogueStart(dialogue)}
          >
            Start
          </button>
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
                    <span>{formatDuration(selectedDialogue.totalDuration)}</span>
                  </div>
                  <div className="config-item">
                    <label>Max Participants:</label>
                    <span>{selectedDialogue.maxParticipants}</span>
                  </div>
                  <div className="config-item">
                    <label>Facilitator:</label>
                    <span>{selectedDialogue.facilitator}</span>
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
                <h4>Enabled Stages</h4>
                <div className="stages-list">
                  {Object.entries(selectedDialogue.stages)
                    .filter(([_, settings]) => settings.enabled)
                    .map(([stage, settings]) => (
                      <div key={stage} className="stage-item">
                        <span className="stage-name">{stage.toUpperCase()}</span>
                        <span className="stage-duration">{settings.duration}m</span>
                      </div>
                    ))
                  }
                </div>
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
    </div>
  );
};

export default DialogueManager;
