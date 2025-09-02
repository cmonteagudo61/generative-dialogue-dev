import React, { useState, useEffect, useCallback, useRef } from 'react';
import CollectiveWisdomCompiler from './CollectiveWisdomCompiler';
import './BreakoutRoomManager.css';

const BreakoutRoomManager = ({ 
  breakoutRooms = {}, 
  currentStage, 
  currentSubstage, 
  isHost = false,
  onTranscriptUpdate,
  onSummaryUpdate,
  dialogueConfig
}) => {
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [roomTranscripts, setRoomTranscripts] = useState({});
  const [roomSummaries, setRoomSummaries] = useState({});
  const [isRecording, setIsRecording] = useState({});
  // eslint-disable-next-line no-unused-vars
  const [editingTranscript, setEditingTranscript] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [summaryRoomId, setSummaryRoomId] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState({});
  const [hostViewMode, setHostViewMode] = useState('overview'); // 'overview', 'room', 'transcript', 'wisdom'
  
  // eslint-disable-next-line no-unused-vars
  const transcriptRefs = useRef({});

  // Initialize active room
  useEffect(() => {
    const roomIds = Object.keys(breakoutRooms);
    if (roomIds.length > 0 && !activeRoomId) {
      setActiveRoomId(roomIds[0]);
    }
  }, [breakoutRooms, activeRoomId]);

  // Load saved transcripts and summaries
  useEffect(() => {
    const savedTranscripts = localStorage.getItem('breakout_transcripts');
    const savedSummaries = localStorage.getItem('breakout_summaries');
    
    if (savedTranscripts) {
      try {
        setRoomTranscripts(JSON.parse(savedTranscripts));
      } catch (error) {
        console.error('Error loading transcripts:', error);
      }
    }
    
    if (savedSummaries) {
      try {
        setRoomSummaries(JSON.parse(savedSummaries));
      } catch (error) {
        console.error('Error loading summaries:', error);
      }
    }
  }, []);

  // Save transcripts and summaries
  useEffect(() => {
    localStorage.setItem('breakout_transcripts', JSON.stringify(roomTranscripts));
  }, [roomTranscripts]);

  useEffect(() => {
    localStorage.setItem('breakout_summaries', JSON.stringify(roomSummaries));
  }, [roomSummaries]);

  // Mock transcript generation (simulates real-time conversation)
  const generateMockTranscript = useCallback((roomId) => {
    const room = breakoutRooms[roomId];
    if (!room || !room.participants) return;

    const mockConversations = {
      connect: [
        "I'm feeling excited about this dialogue opportunity.",
        "What brought you to this conversation today?",
        "I've been thinking a lot about community lately.",
        "There's something powerful about coming together like this.",
        "I appreciate the intentional space we're creating."
      ],
      explore: [
        "That's a really interesting perspective you shared.",
        "I hadn't considered it from that angle before.",
        "Building on what you said, I think...",
        "There's a tension here that feels important to explore.",
        "What if we looked at this differently?"
      ],
      discover: [
        "I'm noticing a pattern in what we've been discussing.",
        "The deeper question seems to be...",
        "What's emerging for me is...",
        "There's wisdom in what you're sharing.",
        "I feel like we're touching something essential here."
      ],
      harvest: [
        "Looking back on our conversation, what stands out?",
        "I'm taking away a sense of...",
        "The key insight for me has been...",
        "This dialogue has shifted something in my thinking.",
        "I feel grateful for this exchange."
      ]
    };

    const stageKey = currentStage?.name || 'connect';
    const phrases = mockConversations[stageKey] || mockConversations.connect;
    
    const participants = room.participants;
    const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
    const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    const timestamp = new Date().toLocaleTimeString();
    const newEntry = {
      id: `entry_${Date.now()}`,
      participant: randomParticipant.name,
      text: randomPhrase,
      timestamp,
      isEdited: false
    };

    setRoomTranscripts(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), newEntry]
    }));

    if (onTranscriptUpdate) {
      onTranscriptUpdate(roomId, newEntry);
    }
  }, [breakoutRooms, currentStage, onTranscriptUpdate]);

  // Auto-generate mock conversation
  useEffect(() => {
    const intervals = {};
    
    Object.keys(breakoutRooms).forEach(roomId => {
      if (isRecording[roomId]) {
        intervals[roomId] = setInterval(() => {
          if (Math.random() > 0.7) { // 30% chance every 3 seconds
            generateMockTranscript(roomId);
          }
        }, 3000);
      }
    });

    return () => {
      Object.values(intervals).forEach(interval => clearInterval(interval));
    };
  }, [breakoutRooms, isRecording, generateMockTranscript]);

  // Recording controls
  const toggleRecording = useCallback((roomId) => {
    setIsRecording(prev => ({
      ...prev,
      [roomId]: !prev[roomId]
    }));
  }, []);

  const startAllRecording = useCallback(() => {
    const allRooms = Object.keys(breakoutRooms);
    const recordingState = {};
    allRooms.forEach(roomId => {
      recordingState[roomId] = true;
    });
    setIsRecording(recordingState);
  }, [breakoutRooms]);

  const stopAllRecording = useCallback(() => {
    setIsRecording({});
  }, []);

  // Transcript editing
  const handleTranscriptEdit = useCallback((roomId, entryId, newText) => {
    setRoomTranscripts(prev => ({
      ...prev,
      [roomId]: prev[roomId]?.map(entry => 
        entry.id === entryId 
          ? { ...entry, text: newText, isEdited: true }
          : entry
      ) || []
    }));
  }, []);

  const addTranscriptEntry = useCallback((roomId, participantName, text) => {
    const newEntry = {
      id: `entry_${Date.now()}`,
      participant: participantName,
      text,
      timestamp: new Date().toLocaleTimeString(),
      isEdited: false
    };

    setRoomTranscripts(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), newEntry]
    }));
  }, []);

  const deleteTranscriptEntry = useCallback((roomId, entryId) => {
    setRoomTranscripts(prev => ({
      ...prev,
      [roomId]: prev[roomId]?.filter(entry => entry.id !== entryId) || []
    }));
  }, []);

  // AI Summary generation
  const generateAISummary = useCallback(async (roomId) => {
    const transcript = roomTranscripts[roomId];
    if (!transcript || transcript.length === 0) return;

    setAiSummaryLoading(prev => ({ ...prev, [roomId]: true }));

    // Mock AI summary generation
    const mockSummaries = {
      connect: [
        "Participants shared their motivations for joining the dialogue, expressing excitement about community building and creating intentional spaces for meaningful conversation.",
        "The group established a foundation of trust and openness, with members sharing personal reflections on what brought them to this moment.",
        "A sense of anticipation and gratitude emerged as participants acknowledged the value of coming together for purposeful dialogue."
      ],
      explore: [
        "The conversation revealed multiple perspectives on the central theme, with participants building on each other's insights and exploring tensions productively.",
        "Key themes emerged around different ways of understanding the topic, with the group demonstrating curiosity and willingness to examine assumptions.",
        "Participants engaged in generative questioning that opened new avenues for exploration and deeper understanding."
      ],
      discover: [
        "The group identified significant patterns and insights, with participants recognizing deeper questions and essential elements of their inquiry.",
        "Wisdom emerged through the collective exploration, with members articulating new understandings and connections.",
        "A sense of touching something fundamental arose as the conversation reached deeper levels of meaning and insight."
      ],
      harvest: [
        "Participants reflected on key takeaways and insights from their dialogue, expressing gratitude for the exchange and noting shifts in their thinking.",
        "The group identified lasting impacts from their conversation, with members articulating how the dialogue influenced their perspectives.",
        "A sense of completion and appreciation emerged as participants acknowledged the value of their shared exploration."
      ]
    };

    const stageKey = currentStage?.name || 'connect';
    const summaries = mockSummaries[stageKey] || mockSummaries.connect;
    const selectedSummary = summaries[Math.floor(Math.random() * summaries.length)];

    // Simulate AI processing delay
    setTimeout(() => {
      const aiSummary = {
        id: `summary_${Date.now()}`,
        roomId,
        stage: currentStage?.name,
        substage: currentSubstage?.name,
        summary: selectedSummary,
        keyThemes: [
          "Connection and trust building",
          "Diverse perspectives shared",
          "Emergent insights and wisdom",
          "Collective meaning-making"
        ],
        participantCount: breakoutRooms[roomId]?.participants?.length || 0,
        transcriptLength: transcript.length,
        generatedAt: new Date().toISOString(),
        isEdited: false
      };

      setRoomSummaries(prev => ({
        ...prev,
        [roomId]: aiSummary
      }));

      setAiSummaryLoading(prev => ({ ...prev, [roomId]: false }));

      if (onSummaryUpdate) {
        onSummaryUpdate(roomId, aiSummary);
      }
    }, 2000);
  }, [roomTranscripts, currentStage, currentSubstage, breakoutRooms, onSummaryUpdate]);

  // Summary editing
  const handleSummaryEdit = useCallback((roomId, newSummary, newThemes) => {
    setRoomSummaries(prev => ({
      ...prev,
      [roomId]: prev[roomId] ? {
        ...prev[roomId],
        summary: newSummary,
        keyThemes: newThemes,
        isEdited: true
      } : null
    }));
  }, []);

  // Room navigation
  const switchToRoom = useCallback((roomId) => {
    setActiveRoomId(roomId);
    setHostViewMode('room');
  }, []);

  // Get room statistics
  const getRoomStats = useCallback((roomId) => {
    const transcript = roomTranscripts[roomId] || [];
    const summary = roomSummaries[roomId];
    const isActive = isRecording[roomId];
    
    return {
      transcriptEntries: transcript.length,
      hasSummary: !!summary,
      isRecording: isActive,
      lastActivity: transcript.length > 0 ? transcript[transcript.length - 1].timestamp : null
    };
  }, [roomTranscripts, roomSummaries, isRecording]);

  if (!isHost) {
    // Participant view - show their assigned room
    const participantRoom = Object.values(breakoutRooms)[0]; // Simplified for demo
    return (
      <ParticipantRoomView 
        room={participantRoom}
        transcript={roomTranscripts[participantRoom?.id] || []}
        currentStage={currentStage}
        currentSubstage={currentSubstage}
      />
    );
  }

  // Host view
  return (
    <div className="breakout-room-manager">
      <div className="room-manager-header">
        <h2>🏠 Breakout Room Management</h2>
        <div className="view-controls">
          <button 
            className={`view-btn ${hostViewMode === 'overview' ? 'active' : ''}`}
            onClick={() => setHostViewMode('overview')}
          >
            📊 Overview
          </button>
          <button 
            className={`view-btn ${hostViewMode === 'room' ? 'active' : ''}`}
            onClick={() => setHostViewMode('room')}
          >
            🏠 Room View
          </button>
          <button 
            className={`view-btn ${hostViewMode === 'transcript' ? 'active' : ''}`}
            onClick={() => setHostViewMode('transcript')}
          >
            📝 Transcripts
          </button>
          <button 
            className={`view-btn ${hostViewMode === 'wisdom' ? 'active' : ''}`}
            onClick={() => setHostViewMode('wisdom')}
          >
            🌐 Collective Wisdom
          </button>
        </div>
        
        <div className="recording-controls">
          <button className="record-btn start" onClick={startAllRecording}>
            🔴 Start All Recording
          </button>
          <button className="record-btn stop" onClick={stopAllRecording}>
            ⏹️ Stop All Recording
          </button>
        </div>
      </div>

      {hostViewMode === 'overview' && (
        <RoomOverview 
          breakoutRooms={breakoutRooms}
          getRoomStats={getRoomStats}
          onRoomSelect={switchToRoom}
          onToggleRecording={toggleRecording}
          onGenerateSummary={generateAISummary}
          aiSummaryLoading={aiSummaryLoading}
        />
      )}

      {hostViewMode === 'room' && activeRoomId && (
        <RoomDetailView 
          room={breakoutRooms[activeRoomId]}
          roomId={activeRoomId}
          transcript={roomTranscripts[activeRoomId] || []}
          summary={roomSummaries[activeRoomId]}
          isRecording={isRecording[activeRoomId]}
          onToggleRecording={() => toggleRecording(activeRoomId)}
          onTranscriptEdit={handleTranscriptEdit}
          onAddEntry={addTranscriptEntry}
          onDeleteEntry={deleteTranscriptEntry}
          onGenerateSummary={() => generateAISummary(activeRoomId)}
          onSummaryEdit={handleSummaryEdit}
          aiSummaryLoading={aiSummaryLoading[activeRoomId]}
        />
      )}

      {hostViewMode === 'transcript' && (
        <TranscriptOverview 
          breakoutRooms={breakoutRooms}
          roomTranscripts={roomTranscripts}
          roomSummaries={roomSummaries}
          onTranscriptEdit={handleTranscriptEdit}
          onSummaryEdit={handleSummaryEdit}
          onGenerateSummary={generateAISummary}
          aiSummaryLoading={aiSummaryLoading}
        />
      )}

      {hostViewMode === 'wisdom' && (
        <CollectiveWisdomCompiler 
          roomSummaries={roomSummaries}
          dialogueConfig={dialogueConfig}
          currentStage={currentStage}
          onWisdomUpdate={(wisdom) => {
            console.log('Collective wisdom updated:', wisdom);
          }}
          isVisible={true}
        />
      )}
    </div>
  );
};

// Room Overview Component
const RoomOverview = ({ 
  breakoutRooms, 
  getRoomStats, 
  onRoomSelect, 
  onToggleRecording, 
  onGenerateSummary,
  aiSummaryLoading 
}) => {
  return (
    <div className="room-overview">
      <div className="room-grid">
        {Object.entries(breakoutRooms).map(([roomId, room]) => {
          const stats = getRoomStats(roomId);
          return (
            <div key={roomId} className="room-card">
              <div className="room-header">
                <h3>{room.name}</h3>
                <div className="room-status">
                  {stats.isRecording && <span className="recording-indicator">🔴 REC</span>}
                </div>
              </div>
              
              <div className="room-participants">
                {room.participants.map((participant, index) => (
                  <span key={index} className="participant-chip">
                    {participant.name}
                  </span>
                ))}
              </div>
              
              <div className="room-stats">
                <div className="stat-item">
                  <span className="stat-icon">💬</span>
                  <span>{stats.transcriptEntries} entries</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">📝</span>
                  <span>{stats.hasSummary ? 'Summary ready' : 'No summary'}</span>
                </div>
                {stats.lastActivity && (
                  <div className="stat-item">
                    <span className="stat-icon">🕐</span>
                    <span>Last: {stats.lastActivity}</span>
                  </div>
                )}
              </div>
              
              <div className="room-actions">
                <button 
                  className="action-btn"
                  onClick={() => onRoomSelect(roomId)}
                >
                  👁️ View
                </button>
                <button 
                  className={`action-btn ${stats.isRecording ? 'recording' : ''}`}
                  onClick={() => onToggleRecording(roomId)}
                >
                  {stats.isRecording ? '⏹️' : '🔴'}
                </button>
                <button 
                  className="action-btn"
                  onClick={() => onGenerateSummary(roomId)}
                  disabled={aiSummaryLoading[roomId] || stats.transcriptEntries === 0}
                >
                  {aiSummaryLoading[roomId] ? '⏳' : '🤖'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Room Detail View Component
const RoomDetailView = ({ 
  room, 
  roomId, 
  transcript, 
  summary, 
  isRecording,
  onToggleRecording,
  onTranscriptEdit,
  onAddEntry,
  onDeleteEntry,
  onGenerateSummary,
  onSummaryEdit,
  aiSummaryLoading
}) => {
  const [newEntryText, setNewEntryText] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState('');
  const [editingEntry, setEditingEntry] = useState(null);
  const [editText, setEditText] = useState('');

  const handleAddEntry = () => {
    if (newEntryText.trim() && selectedParticipant) {
      onAddEntry(roomId, selectedParticipant, newEntryText.trim());
      setNewEntryText('');
    }
  };

  const startEditing = (entry) => {
    setEditingEntry(entry.id);
    setEditText(entry.text);
  };

  const saveEdit = () => {
    if (editingEntry && editText.trim()) {
      onTranscriptEdit(roomId, editingEntry, editText.trim());
      setEditingEntry(null);
      setEditText('');
    }
  };

  const cancelEdit = () => {
    setEditingEntry(null);
    setEditText('');
  };

  return (
    <div className="room-detail-view">
      <div className="room-detail-header">
        <h3>{room.name}</h3>
        <div className="room-controls">
          <button 
            className={`record-btn ${isRecording ? 'recording' : ''}`}
            onClick={onToggleRecording}
          >
            {isRecording ? '⏹️ Stop Recording' : '🔴 Start Recording'}
          </button>
          <button 
            className="summary-btn"
            onClick={onGenerateSummary}
            disabled={aiSummaryLoading || transcript.length === 0}
          >
            {aiSummaryLoading ? '⏳ Generating...' : '🤖 Generate Summary'}
          </button>
        </div>
      </div>

      <div className="room-content">
        <div className="transcript-section">
          <h4>💬 Live Transcript</h4>
          <div className="transcript-container">
            {transcript.map(entry => (
              <div key={entry.id} className="transcript-entry">
                <div className="entry-header">
                  <span className="participant-name">{entry.participant}</span>
                  <span className="timestamp">{entry.timestamp}</span>
                  {entry.isEdited && <span className="edited-badge">✏️ Edited</span>}
                </div>
                
                {editingEntry === entry.id ? (
                  <div className="edit-mode">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="edit-textarea"
                    />
                    <div className="edit-actions">
                      <button className="save-btn" onClick={saveEdit}>💾 Save</button>
                      <button className="cancel-btn" onClick={cancelEdit}>❌ Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="entry-content">
                    <p>{entry.text}</p>
                    <div className="entry-actions">
                      <button 
                        className="edit-btn"
                        onClick={() => startEditing(entry)}
                      >
                        ✏️
                      </button>
                      <button 
                        className="delete-btn"
                        onClick={() => onDeleteEntry(roomId, entry.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {transcript.length === 0 && (
              <div className="empty-transcript">
                <p>No conversation recorded yet.</p>
                <p>Start recording to capture the dialogue.</p>
              </div>
            )}
          </div>

          <div className="add-entry-section">
            <h5>➕ Add Manual Entry</h5>
            <div className="add-entry-form">
              <select 
                value={selectedParticipant}
                onChange={(e) => setSelectedParticipant(e.target.value)}
                className="participant-select"
              >
                <option value="">Select participant...</option>
                {room.participants.map((participant, index) => (
                  <option key={index} value={participant.name}>
                    {participant.name}
                  </option>
                ))}
              </select>
              <textarea
                value={newEntryText}
                onChange={(e) => setNewEntryText(e.target.value)}
                placeholder="What did they say?"
                className="entry-textarea"
              />
              <button 
                className="add-btn"
                onClick={handleAddEntry}
                disabled={!newEntryText.trim() || !selectedParticipant}
              >
                ➕ Add Entry
              </button>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <h4>📝 AI Summary</h4>
          {summary ? (
            <SummaryDisplay 
              summary={summary}
              onEdit={onSummaryEdit}
              roomId={roomId}
            />
          ) : (
            <div className="no-summary">
              <p>No summary generated yet.</p>
              <p>Generate an AI summary of the conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Summary Display Component
const SummaryDisplay = ({ summary, onEdit, roomId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editSummary, setEditSummary] = useState(summary.summary);
  const [editThemes, setEditThemes] = useState(summary.keyThemes.join(', '));

  const handleSave = () => {
    const themes = editThemes.split(',').map(theme => theme.trim()).filter(theme => theme);
    onEdit(roomId, editSummary, themes);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditSummary(summary.summary);
    setEditThemes(summary.keyThemes.join(', '));
    setIsEditing(false);
  };

  return (
    <div className="summary-display">
      {isEditing ? (
        <div className="summary-edit-mode">
          <div className="edit-field">
            <label>Summary:</label>
            <textarea
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              className="summary-textarea"
            />
          </div>
          <div className="edit-field">
            <label>Key Themes (comma-separated):</label>
            <input
              value={editThemes}
              onChange={(e) => setEditThemes(e.target.value)}
              className="themes-input"
            />
          </div>
          <div className="edit-actions">
            <button className="save-btn" onClick={handleSave}>💾 Save</button>
            <button className="cancel-btn" onClick={handleCancel}>❌ Cancel</button>
          </div>
        </div>
      ) : (
        <div className="summary-view-mode">
          <div className="summary-header">
            <span className="summary-meta">
              Generated: {new Date(summary.generatedAt).toLocaleString()}
            </span>
            {summary.isEdited && <span className="edited-badge">✏️ Edited</span>}
            <button 
              className="edit-btn"
              onClick={() => setIsEditing(true)}
            >
              ✏️ Edit
            </button>
          </div>
          
          <div className="summary-content">
            <p>{summary.summary}</p>
          </div>
          
          <div className="key-themes">
            <h5>🎯 Key Themes:</h5>
            <div className="theme-tags">
              {summary.keyThemes.map((theme, index) => (
                <span key={index} className="theme-tag">{theme}</span>
              ))}
            </div>
          </div>
          
          <div className="summary-stats">
            <span>📊 {summary.transcriptLength} transcript entries</span>
            <span>👥 {summary.participantCount} participants</span>
            <span>🎭 {summary.stage} stage</span>
          </div>
        </div>
      )}
    </div>
  );
};

// Transcript Overview Component
const TranscriptOverview = ({ 
  breakoutRooms, 
  roomTranscripts, 
  roomSummaries,
  onTranscriptEdit,
  onSummaryEdit,
  onGenerateSummary,
  aiSummaryLoading
}) => {
  return (
    <div className="transcript-overview">
      <h3>📝 All Room Transcripts & Summaries</h3>
      
      {Object.entries(breakoutRooms).map(([roomId, room]) => {
        const transcript = roomTranscripts[roomId] || [];
        const summary = roomSummaries[roomId];
        
        return (
          <div key={roomId} className="room-transcript-card">
            <div className="transcript-card-header">
              <h4>{room.name}</h4>
              <div className="transcript-stats">
                <span>💬 {transcript.length} entries</span>
                <span>👥 {room.participants.length} participants</span>
                {summary && <span>📝 Summary ready</span>}
              </div>
            </div>
            
            {transcript.length > 0 && (
              <div className="transcript-preview">
                <h5>Recent Conversation:</h5>
                <div className="transcript-entries">
                  {transcript.slice(-3).map(entry => (
                    <div key={entry.id} className="transcript-entry-preview">
                      <span className="participant">{entry.participant}:</span>
                      <span className="text">{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {summary && (
              <div className="summary-preview">
                <h5>AI Summary:</h5>
                <p>{summary.summary}</p>
                <div className="theme-tags">
                  {summary.keyThemes.slice(0, 3).map((theme, index) => (
                    <span key={index} className="theme-tag">{theme}</span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="transcript-actions">
              {!summary && (
                <button 
                  className="generate-summary-btn"
                  onClick={() => onGenerateSummary(roomId)}
                  disabled={aiSummaryLoading[roomId] || transcript.length === 0}
                >
                  {aiSummaryLoading[roomId] ? '⏳ Generating...' : '🤖 Generate Summary'}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Participant Room View Component
const ParticipantRoomView = ({ room, transcript, currentStage, currentSubstage }) => {
  return (
    <div className="participant-room-view">
      <div className="participant-header">
        <h2>🏠 {room?.name || 'Your Breakout Room'}</h2>
        <div className="stage-info">
          <span className="current-stage">
            {currentStage?.name?.charAt(0).toUpperCase() + currentStage?.name?.slice(1)} Stage
          </span>
          {currentSubstage && (
            <span className="current-substage">
              {currentSubstage.name}
            </span>
          )}
        </div>
      </div>
      
      <div className="room-participants">
        <h3>👥 Participants in this room:</h3>
        <div className="participant-list">
          {room?.participants?.map((participant, index) => (
            <div key={index} className="participant-item">
              <span className="participant-name">{participant.name}</span>
              <span className="participant-status">✅</span>
            </div>
          ))}
        </div>
      </div>
      
      <div className="current-prompt">
        <h3>💬 Current Prompt:</h3>
        <p className="prompt-text">{currentSubstage?.prompt}</p>
        
        {currentSubstage?.breakoutInstructions && (
          <div className="breakout-instructions">
            <h4>Instructions for your group:</h4>
            <p>{currentSubstage.breakoutInstructions}</p>
          </div>
        )}
      </div>
      
      <div className="conversation-space">
        <h3>🎙️ Conversation Space</h3>
        <div className="conversation-placeholder">
          <p>This is where your video/audio conversation would take place.</p>
          <p>In a full implementation, this would integrate with your video conferencing system.</p>
        </div>
      </div>
      
      {transcript.length > 0 && (
        <div className="live-transcript">
          <h3>📝 Live Transcript</h3>
          <div className="transcript-feed">
            {transcript.slice(-5).map(entry => (
              <div key={entry.id} className="transcript-entry">
                <span className="participant">{entry.participant}:</span>
                <span className="text">{entry.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BreakoutRoomManager;
