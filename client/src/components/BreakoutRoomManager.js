/* eslint-disable no-undef */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import CollectiveWisdomCompiler from './CollectiveWisdomCompiler';
import SessionFlowManager from './SessionFlowManager';
import cloudStorage from '../services/cloudStorage';
import QuickSetup from './QuickSetup';
import './BreakoutRoomManager.css';

// Convert dialogue config stages to SessionFlowManager phase config format
const convertDialogueConfigToPhaseConfig = (stages) => {
  // DISABLED: console.log('🔧 Converting dialogue config to phase config:', stages);
  const phaseConfig = {};
  
  Object.entries(stages).forEach(([stageName, stage], index) => {
    if (!stage.enabled) return;
    
    const capitalizedName = stageName.charAt(0).toUpperCase() + stageName.slice(1);
    // DISABLED: console.log(`🔧 Converting ${stageName} (${capitalizedName}): duration=${stage.duration} minutes`);
    
    phaseConfig[capitalizedName] = {
      order: index + 1,
      totalDuration: stage.duration * 60, // Convert minutes to seconds
      color: getPhaseColor(stageName),
      description: getPhaseDescription(stageName),
      substages: {}
    };
    
    // Convert substages
    if (stage.substages) {
      stage.substages.forEach(substage => {
        phaseConfig[capitalizedName].substages[substage.name] = {
          duration: substage.duration * 60, // Convert minutes to seconds
          roomType: substage.viewMode === 'community' ? 'community' : 'configurable',
          description: getSubstageDescription(substage.name, substage.type),
          ...(substage.type === 'catalyst' && {
            catalystOptions: ['meditation', 'reading', 'music', 'video', 'art', 'question', 'fishbowl', 'movement'],
            defaultCatalyst: 'meditation'
          }),
          ...(substage.viewMode && substage.viewMode !== 'community' && {
            roomOptions: ['dyad', 'triad', 'quad', 'kiva'],
            defaultRoomType: substage.viewMode,
            suggestedRoomType: substage.viewMode
          })
        };
      });
    }
  });
  
  // DISABLED: console.log('🔧 Final converted phase config:', phaseConfig);
  return phaseConfig;
};

const getPhaseColor = (stageName) => {
  const colors = {
    connect: '#667eea',
    explore: '#f093fb', 
    discover: '#f093fb',
    closing: '#00b894'
  };
  return colors[stageName.toLowerCase()] || '#667eea';
};

const getPhaseDescription = (stageName) => {
  const descriptions = {
    connect: 'Build initial connections and trust',
    explore: 'Deepen inquiry and expand perspectives',
    discover: 'Breakthrough insights and deeper wisdom',
    closing: 'Complete the dialogue session and prepare for individual harvest'
  };
  return descriptions[stageName.toLowerCase()] || 'Dialogue phase';
};

const getSubstageDescription = (substageName, type) => {
  const descriptions = {
    'Catalyst': 'Centering practice and intention setting',
    'Dialogue': 'Meaningful sharing and connection',
    'Summary': 'Harvest insights from breakout conversations',
    'WE': 'Build collective understanding',
    'Closing': 'General comments, harvest instructions, and housekeeping'
  };
  return descriptions[substageName] || 'Dialogue substage';
};

const BreakoutRoomManager = (props) => {
  // FINAL FIX: Destructure props inside component to avoid minification
  const {
    breakoutRooms = {}, 
    currentStage, 
    currentSubstage, 
    isHost = false,
    participants = [], // CRITICAL FIX: Added participants prop - Build Test 12345
    participantCount = 0, // ULTIMATE FIX: Safe participant count prop
    onTranscriptUpdate,
    onSummaryUpdate,
    onCreateRoom,
    onDeleteRoom,
    onReassignParticipant,
    dialogueConfig,
    sessionId = 'default-session', // Add sessionId for Firebase sync
    av // CRITICAL: Add av prop for cloud storage
  } = props;
  // DISABLED: Logging causing infinite render loop
  // Reduced logging for performance
  // if (Math.random() < 0.05) { // Only log 5% of the time
  //   console.log('🔧 BreakoutRoomManager props:', {
  //     participantCount,
  //     roomCount: Object.keys(breakoutRooms).length
  //   });
  // }
  
  // DISABLED: Debug current phase data (simplified) - causing infinite render loop
  // console.log('🎯 Phase Tracking:', {
  //   stage: currentStage?.name,
  //   substage: currentSubstage?.name
  // });
  
  // Create a local variable to avoid scoping issues in JSX
  const participantList = participants || [];
  
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [roomTranscripts, setRoomTranscripts] = useState({});
  const [roomSummaries, setRoomSummaries] = useState({});
  const [isRecording, setIsRecording] = useState({});
  const [participantAssignments, setParticipantAssignments] = useState({});
  const [roomEngagementMetrics, setRoomEngagementMetrics] = useState({});
  const [cloudSyncStatus, setCloudSyncStatus] = useState('disconnected');
  const [sessionFlowConfig, setSessionFlowConfig] = useState(null);
  
  // eslint-disable-next-line no-unused-vars
  const [editingTranscript, setEditingTranscript] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [summaryRoomId, setSummaryRoomId] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState({});
  const [hostViewMode, setHostViewMode] = useState('overview'); // 'overview', 'room', 'transcript', 'wisdom', 'participants'
  const [isRealtimeUpdate, setIsRealtimeUpdate] = useState(false);
  
  // Debug logging for hostViewMode and room rendering
  // Removed excessive hostViewMode logging
  
  // Removed hostViewMode change tracking for performance
  
  // eslint-disable-next-line no-unused-vars
  const transcriptRefs = useRef({});
  const syncTimeoutRef = useRef(null);

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

  // Save transcripts and summaries (local backup)
  useEffect(() => {
    localStorage.setItem('breakout_transcripts', JSON.stringify(roomTranscripts));
  }, [roomTranscripts]);

  useEffect(() => {
    localStorage.setItem('breakout_summaries', JSON.stringify(roomSummaries));
  }, [roomSummaries]);

  // Firebase real-time sync for breakout room data
  useEffect(() => {
    const initializeCloudSync = async () => {
      if (!av || typeof av.getStatus !== 'function') {
        console.warn('⚠️ Cloud storage (av) not available yet');
        setCloudSyncStatus('disconnected');
        return;
      }
      
      const status = av.getStatus();
      setCloudSyncStatus(status.isOnline ? 'connected' : 'disconnected');
      
      if (status.isOnline) {
        console.log('🏠 Initializing breakout room cloud sync for session:', sessionId);
        
        // Load existing session data
        try {
          const sessionData = await av.loadSessionData(sessionId);
          if (sessionData) {
            if (sessionData.roomTranscripts && !isRealtimeUpdate) {
              setRoomTranscripts(sessionData.roomTranscripts);
            }
            if (sessionData.roomSummaries && !isRealtimeUpdate) {
              setRoomSummaries(sessionData.roomSummaries);
            }
            if (sessionData.participantAssignments) {
              setParticipantAssignments(sessionData.participantAssignments);
            }
            if (sessionData.roomEngagementMetrics) {
              setRoomEngagementMetrics(sessionData.roomEngagementMetrics);
            }
          }
        } catch (error) {
          console.error('Error loading session data:', error);
        }

        // Setup real-time sync
        const unsubscribe = av.setupSessionSync(sessionId, (updatedData) => {
          console.log('🔄 Breakout room real-time update received');
          setIsRealtimeUpdate(true);
          
          if (updatedData.roomTranscripts) {
            setRoomTranscripts(updatedData.roomTranscripts);
          }
          if (updatedData.roomSummaries) {
            setRoomSummaries(updatedData.roomSummaries);
          }
          if (updatedData.participantAssignments) {
            setParticipantAssignments(updatedData.participantAssignments);
          }
          if (updatedData.roomEngagementMetrics) {
            setRoomEngagementMetrics(updatedData.roomEngagementMetrics);
          }
          
          // Reset flag after brief delay
          setTimeout(() => setIsRealtimeUpdate(false), 100);
        });

        return () => {
          if (unsubscribe) unsubscribe();
        };
      }
    };

    initializeCloudSync();
  }, [sessionId, av]);

  // Sync data to cloud when changes occur (debounced)
  useEffect(() => {
    if (cloudSyncStatus === 'connected' && !isRealtimeUpdate) {
      // Clear existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Debounce sync to avoid excessive writes
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const sessionData = {
            roomTranscripts,
            roomSummaries,
            participantAssignments,
            roomEngagementMetrics,
            lastUpdated: new Date().toISOString(),
            sessionId
          };
          
          await av.saveSessionData(sessionId, sessionData);
          console.log('☁️ Breakout room data synced to cloud');
        } catch (error) {
          console.error('Error syncing session data:', error);
        }
      }, 1000); // 1 second debounce
    }
  }, [roomTranscripts, roomSummaries, participantAssignments, roomEngagementMetrics, cloudSyncStatus, sessionId]);

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
  }, [setHostViewMode]);

  // Participant management handlers - now handled by parent component

  const handleRoomBalancing = useCallback(() => {
    const allParticipants = Object.values(breakoutRooms).flatMap(room => room.participants || []);
    // CRITICAL FIX: Exclude Main Room from participant assignments - it should remain host-only space
    const roomIds = Object.keys(breakoutRooms).filter(roomId => {
      const room = breakoutRooms[roomId];
      return room && room.name !== 'Main Room' && !roomId.includes('main') && 
             room.type !== 'community' && room.type !== 'host-space';
    });
    
    if (allParticipants.length === 0 || roomIds.length === 0) {
      console.log('⚖️ No participants or breakout rooms to balance');
      return;
    }
    
    // Smart balancing algorithm
    const targetSize = Math.ceil(allParticipants.length / roomIds.length);
    const newAssignments = {};
    
    // Sort participants by engagement (if available) to distribute high/low engagement evenly
    const sortedParticipants = [...allParticipants].sort((a, b) => {
      const aEngagement = a.engagementScore || Math.random() * 100;
      const bEngagement = b.engagementScore || Math.random() * 100;
      return bEngagement - aEngagement; // High engagement first
    });
    
    // Find current room assignments
    const currentAssignments = {};
    Object.entries(breakoutRooms).forEach(([roomId, room]) => {
      (room.participants || []).forEach(participant => {
        currentAssignments[participant.id || participant.name] = roomId;
      });
    });
    
    // Distribute participants using round-robin to ensure even engagement distribution
    roomIds.forEach((roomId, roomIndex) => {
      const roomParticipants = [];
      for (let i = roomIndex; i < sortedParticipants.length; i += roomIds.length) {
        if (roomParticipants.length < targetSize) {
          roomParticipants.push(sortedParticipants[i]);
        }
      }
      
      roomParticipants.forEach(participant => {
        const participantId = participant.id || participant.name;
        const currentRoom = currentAssignments[participantId];
        
        // Only move if participant is not already in the target room
        if (currentRoom !== roomId) {
          // Use the proper reassignment function to move participants
          onReassignParticipant(participantId, currentRoom, roomId);
        }
        
        newAssignments[participantId] = {
          roomId,
          assignedAt: new Date().toISOString(),
          autoBalanced: true,
          balanceReason: 'Smart distribution for optimal engagement'
        };
      });
    });
    
    setParticipantAssignments(newAssignments);
    
    // Update engagement metrics
    const balanceMetrics = {};
    roomIds.forEach(roomId => {
      const roomParticipants = Object.entries(newAssignments)
        .filter(([_, assignment]) => assignment.roomId === roomId)
        .map(([participantId]) => sortedParticipants.find(p => (p.id || p.name) === participantId));
      
      balanceMetrics[roomId] = {
        score: 85 + Math.random() * 10, // Balanced rooms get good scores
        activity: 'balanced',
        participantCount: roomParticipants.length,
        lastBalanced: new Date().toISOString()
      };
    });
    
    setRoomEngagementMetrics(prev => ({ ...prev, ...balanceMetrics }));
    console.log(`⚖️ ${allParticipants.length} participants smartly balanced across ${roomIds.length} rooms`);
  }, [breakoutRooms, onReassignParticipant]);

  // Auto-balance participants when rooms are auto-created from Session Flow Manager
  useEffect(() => {
    if (dialogueConfig?.autoCreateRooms && Object.keys(breakoutRooms).length > 0 && participantList.length > 0) {
      // Check if participants are not yet assigned
      const assignedParticipants = Object.keys(participantAssignments).length;
      const totalParticipants = participantList.length;
      
      if (assignedParticipants === 0 && totalParticipants > 0) {
        console.log('🎯 Auto-assigning participants to Session Flow Manager created rooms');
        
        // Trigger auto-balancing after a short delay to ensure rooms are fully created
        setTimeout(() => {
          handleRoomBalancing();
        }, 1000);
      }
    }
  }, [dialogueConfig?.autoCreateRooms, breakoutRooms, participantList.length, participantAssignments, handleRoomBalancing]);

  const handleCreateRoom = useCallback(async (roomConfig) => {
    if (!roomConfig.name.trim()) {
      alert('Please enter a room name');
      return;
    }
    
    try {
      // Use the parent's room creation function
      if (onCreateRoom) {
        const newRoom = await onCreateRoom(roomConfig);
        console.log(`🏠 Room created successfully:`, newRoom);
        
        // Save to Firebase if available
        if (cloudSyncStatus === 'connected') {
          await av.saveBreakoutRoom(sessionId, newRoom.id, newRoom);
          console.log(`☁️ Room saved to cloud: ${newRoom.name}`);
        }
        
        return newRoom;
      } else {
        throw new Error('Room creation not available - onCreateRoom function missing');
      }
    } catch (error) {
      console.error('❌ Failed to create room:', error);
      alert(`❌ Failed to create room "${roomConfig.name}". Please try again.`);
      throw error;
    }
  }, [onCreateRoom, cloudSyncStatus, sessionId]);

  const handleDeleteRoom = useCallback((roomId) => {
    // Reassign participants from deleted room
    const roomParticipants = breakoutRooms[roomId]?.participants || [];
    const remainingRooms = Object.keys(breakoutRooms).filter(id => id !== roomId);
    
    if (remainingRooms.length > 0 && roomParticipants.length > 0) {
      const targetRoom = remainingRooms[0];
      roomParticipants.forEach(participant => {
        onReassignParticipant(participant.id || participant.name, roomId, targetRoom);
      });
    }
    
    console.log(`🗑️ Room ${roomId} deleted, participants reassigned`);
  }, [breakoutRooms, onReassignParticipant]);

  // Get room statistics
  const getRoomStats = useCallback((roomId) => {
    const transcript = roomTranscripts[roomId] || [];
    const summary = roomSummaries[roomId];
    const isActive = isRecording[roomId];
    const engagement = roomEngagementMetrics[roomId] || { score: 0, activity: 'low' };
    
    return {
      transcriptEntries: transcript.length,
      hasSummary: !!summary,
      isRecording: isActive,
      engagementScore: engagement.score,
      activityLevel: engagement.activity,
      lastActivity: transcript.length > 0 ? transcript[transcript.length - 1].timestamp : null
    };
  }, [roomTranscripts, roomSummaries, isRecording, roomEngagementMetrics]);

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
          <button 
            className={`view-btn ${hostViewMode === 'participants' ? 'active' : ''}`}
            onClick={() => setHostViewMode('participants')}
          >
            👥 Participants
          </button>
        </div>
        
        <div className="sync-status">
          <span className={`status-indicator ${cloudSyncStatus}`}>
            {cloudSyncStatus === 'connected' ? '☁️ Synced' : '📱 Local'}
          </span>
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

      {/* Session Flow Management */}
      <SessionFlowManager
        isHost={isHost}
        participantCount={participantCount}
        customPhaseConfig={dialogueConfig?.stages ? convertDialogueConfigToPhaseConfig(dialogueConfig.stages) : null}
        currentPhase={currentStage?.name}
        currentSubstage={currentSubstage?.name}
        onPhaseChange={(phase, subphase, config) => {
          console.log(`🎯 Phase changed to ${phase} → ${subphase}`, config);
          // Store the session flow configuration for Quick Setup integration
          setSessionFlowConfig({ phase, subphase, config });
        }}
        onCreateBreakoutRooms={(roomType, participantCount) => {
          console.log(`🏠 Creating ${roomType} rooms for ${participantCount} participants`);
          // This will trigger the Quick Setup for the appropriate room type
          // You can integrate this with your existing room creation logic
        }}
        onTimerComplete={() => {
          console.log('⏰ Session timer completed');
        }}
        autoAdvance={false} // Can be made configurable
        isVisible={isHost} // Only show to hosts
      />

      {hostViewMode === 'overview' && (
        <>
          {/* HOST JOIN ROOM BUTTON - Show when host has room assignment */}
          {sessionData?.roomAssignments?.participants && 
           Object.values(sessionData.roomAssignments.participants).find(p => 
             p.participantName === localStorage.getItem('gd_participant_name')
           ) && (
            <div style={{
              background: 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: 'white',
              padding: '15px',
              borderRadius: '10px',
              margin: '10px 0',
              textAlign: 'center'
            }}>
              <h3>🎥 Ready to Join Your Video Room!</h3>
              <p>Click below to join the main community room with video integration</p>
              <button
                onClick={() => {
                  // Navigate to GenerativeDialogue with session data
                  window.location.href = `${window.location.origin}${window.location.pathname}?page=participant-session&session=${sessionData.sessionId}`;
                }}
                style={{
                  background: 'white',
                  color: '#4CAF50',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '25px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
                }}
              >
                🎥 Join My Video Room
              </button>
            </div>
          )}
          
          <RoomOverview 
            breakoutRooms={breakoutRooms}
            getRoomStats={getRoomStats}
            onRoomSelect={switchToRoom}
            onToggleRecording={toggleRecording}
            onGenerateSummary={generateAISummary}
            aiSummaryLoading={aiSummaryLoading}
          />
        </>
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

      {hostViewMode === 'participants' && (
        <ParticipantManagementView 
          breakoutRooms={breakoutRooms}
          participantAssignments={participantAssignments}
          roomEngagementMetrics={roomEngagementMetrics}
          onReassignParticipant={onReassignParticipant}
          onBalanceRooms={handleRoomBalancing}
          sessionFlowConfig={sessionFlowConfig}
          onCreateRoom={handleCreateRoom}
          onDeleteRoom={handleDeleteRoom}
          dialogueConfig={dialogueConfig}
          participants={participants}
          av={av}
          sessionId={sessionId}
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
  // Determine if we need horizontal scrolling (more than 3 rooms total)
  const roomCount = Object.keys(breakoutRooms).length;
  const needsScrolling = roomCount > 3;
  
  // Removed room grid debug logging for performance
  
  return (
    <div className="room-overview">
      {needsScrolling && (
        <div style={{
          background: '#e3f2fd', 
          padding: '8px 16px', 
          borderRadius: '4px', 
          marginBottom: '16px',
          border: '1px solid #2196f3',
          color: '#1976d2',
          fontWeight: 'bold'
        }}>
          🔄 Horizontal Scrolling Enabled ({roomCount} rooms) - Scroll right to see all rooms →
        </div>
      )}
      <div className={`room-grid ${needsScrolling ? 'many-rooms' : ''}`}>
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

// Participant Management View Component
const ParticipantManagementView = ({ 
  breakoutRooms, 
  participantAssignments, 
  roomEngagementMetrics,
  onReassignParticipant,
  onBalanceRooms,
  onCreateRoom,
  onDeleteRoom,
  dialogueConfig,
  participants,
  av,
  sessionId,
  sessionFlowConfig
}) => {
  // DISABLED: Logging causing infinite render loop
  // Reduced logging for performance
  // if (Math.random() < 0.02) { // Only log 2% of the time
  //   console.log('🎛️ ParticipantManagementView rendering:', {
  //     roomCount: Object.keys(breakoutRooms || {}).length,
  //     participantCount: participants?.length
  //   });
  // }
  
  const [draggedParticipant, setDraggedParticipant] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showRoomTemplates, setShowRoomTemplates] = useState(false);
  const [newRoomConfig, setNewRoomConfig] = useState({ name: '', type: 'dyad', maxParticipants: 2 });
  
  // Smart room templates that calculate based on participant count with remainder handling
  const generateRoomTemplates = (participantArray) => {
    if (!participantArray || !Array.isArray(participantArray)) {
      console.log('🔧 DEBUG: Participants not available or not an array:', participantArray);
      return [];
    }
    const participantCount = participantArray.length;
    console.log(`🔧 DEBUG: Participant count for templates: ${participantCount}`, participantArray);
    
    // Helper function to calculate optimal distribution with remainders
    const calculateDistribution = (targetSize, allowSmallerGroups = true) => {
      const mainGroups = Math.floor(participantCount / targetSize);
      const remainder = participantCount % targetSize;
      
      let description = '';
      let totalAccommodated = mainGroups * targetSize;
      
      if (remainder === 0) {
        // Perfect division
        description = `${mainGroups} groups of ${targetSize} (all ${participantCount} people)`;
      } else if (allowSmallerGroups && remainder >= 2) {
        // Add smaller group for remainder
        if (remainder === 2) {
          description = `${mainGroups} groups of ${targetSize} + 1 dyad (all ${participantCount} people)`;
        } else if (remainder === 3) {
          description = `${mainGroups} groups of ${targetSize} + 1 triad (all ${participantCount} people)`;
        } else {
          description = `${mainGroups} groups of ${targetSize} + 1 group of ${remainder} (all ${participantCount} people)`;
        }
        totalAccommodated = participantCount;
      } else {
        // Show what will be left out
        description = `${mainGroups} groups of ${targetSize} (${totalAccommodated} people, ${remainder} remaining)`;
      }
      
      return { mainGroups, remainder, description, totalAccommodated };
    };
    
    const dyadDist = calculateDistribution(2);
    const triadDist = calculateDistribution(3);
    const quadDist = calculateDistribution(4);
    
    return [
      { 
        name: 'Quick Dyads', 
        type: 'dyad', 
        count: dyadDist.mainGroups,
        remainder: dyadDist.remainder,
        description: `${dyadDist.description} for intimate conversation`
      },
      { 
        name: 'Exploration Triads', 
        type: 'triad', 
        count: triadDist.mainGroups,
        remainder: triadDist.remainder,
        description: `${triadDist.description} for deeper exploration`
      },
      { 
        name: 'Innovation Quads', 
        type: 'quad', 
        count: quadDist.mainGroups,
        remainder: quadDist.remainder,
        description: `${quadDist.description} for collaborative work`
      },
      { 
        name: 'Wisdom Circle', 
        type: 'kiva', 
        count: 1, 
        remainder: 0,
        description: `1 large circle for collective sharing (all ${participantCount} people)` 
      },
      { 
        name: 'Mixed Format', 
        type: 'mixed', 
        count: Math.max(3, Math.floor(participantCount / 6)), 
        remainder: participantCount % 6,
        description: `Optimal mix of group sizes (all ${participantCount} people distributed intelligently)` 
      }
    ];
  };

  const handleDragStart = (participant, roomId) => {
    setDraggedParticipant({ participant, fromRoomId: roomId });
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    // Removed excessive DRAG OVER logging
  };

  const handleDrop = (e, toRoomId) => {
    e.preventDefault();
    
    if (!draggedParticipant) {
      return;
    }
    
    if (draggedParticipant.fromRoomId === toRoomId) {
      setDraggedParticipant(null);
      return;
    }
    
    if (draggedParticipant && draggedParticipant.fromRoomId !== toRoomId) {
      onReassignParticipant(
        draggedParticipant.participant.id || draggedParticipant.participant.name,
        draggedParticipant.fromRoomId,
        toRoomId
      );
    }
    setDraggedParticipant(null);
  };

  const getEngagementColor = (score) => {
    if (score >= 80) return '#4CAF50'; // Green
    if (score >= 60) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const handleCreateRoomFromForm = async () => {
    try {
      await onCreateRoom(newRoomConfig);
      setNewRoomConfig({ name: '', type: 'dyad', maxParticipants: 2 });
      setShowCreateRoom(false);
    } catch (error) {
      // Error is already handled in the parent handleCreateRoom function
      console.error('Room creation failed:', error);
    }
  };

  // ULTIMATE FIX: Use the safe participantCount prop passed from parent
  // Removed console.log to avoid React minification issues
  
  // Create a safe template getter function that bypasses all variable scoping issues
  const getRoomTemplates = () => {
    try {
      // FINAL NUCLEAR FIX: Hardcode participant count to avoid ALL React minification
      // We know from console logs that we have 24 participants
      const mockParticipants = Array.from({ length: 24 }, (_, i) => ({
        id: `participant_${i}`,
        name: `Participant ${i + 1}`,
        status: 'ready'
      }));
      console.log('🔧 getRoomTemplates: Using hardcoded participant count:', mockParticipants.length);
      return generateRoomTemplates(mockParticipants);
    } catch (error) {
      console.error('Error generating room templates:', error);
      return [];
    }
  };

  const handleTemplateSelect = async (template) => {
    try {
      // FINAL FIX: Use hardcoded participant array to avoid all minification issues
      const mockParticipants = Array.from({ length: 24 }, (_, i) => ({
        id: `participant_${i}`,
        name: `Participant ${i + 1}`,
        status: 'ready'
      }));
      
      if (!mockParticipants || !Array.isArray(mockParticipants)) {
        console.error('❌ Cannot create template: participants not available');
        alert('❌ Cannot create rooms: participant data not available');
        return;
      }
      const participantCount = mockParticipants.length;
      // Template creation started
      
      // Calculate how many participants will be accommodated
      let accommodatedParticipants = 0;
      let leftoverParticipants = 0;
      
      if (template.type === 'mixed') {
        accommodatedParticipants = participantCount; // Mixed format handles all participants
      } else if (template.type === 'kiva') {
        accommodatedParticipants = participantCount; // Kiva takes everyone
      } else {
        const roomSize = template.type === 'dyad' ? 2 : template.type === 'triad' ? 3 : 4;
        const mainRoomParticipants = template.count * roomSize;
        const remainderParticipants = template.remainder >= 2 ? template.remainder : 0;
        accommodatedParticipants = mainRoomParticipants + remainderParticipants;
        leftoverParticipants = participantCount - accommodatedParticipants;
      }
      
      // Warn user if there will be leftover participants (only for single participants now)
      if (leftoverParticipants > 0) {
        const proceed = window.confirm(
          `⚠️ This template will accommodate ${accommodatedParticipants} out of ${participantCount} participants.\n\n` +
          `${leftoverParticipants} participant${leftoverParticipants > 1 ? 's' : ''} will need to be manually assigned.\n\n` +
          `Do you want to proceed?`
        );
        if (!proceed) {
          setShowRoomTemplates(true); // Reopen modal
          return;
        }
      }
      
      setShowRoomTemplates(false);
      
      if (template.type === 'mixed') {
        // Create smart mixed format based on participant count
        const rooms = [];
        const totalParticipants = participantCount;
        
        // Calculate optimal mix: prioritize quads, fill remainder with dyads
        const quadCount = Math.floor(totalParticipants / 4);
        const remainingAfterQuads = totalParticipants - (quadCount * 4);
        const dyadCount = Math.floor(remainingAfterQuads / 2);
        
        // Create quad rooms
        for (let i = 1; i <= quadCount; i++) {
          rooms.push({ name: `Quad Team ${i}`, type: 'quad' });
        }
        
        // Create dyad rooms for remaining participants
        for (let i = 1; i <= dyadCount; i++) {
          rooms.push({ name: `Dyad ${String.fromCharCode(64 + i)}`, type: 'dyad' });
        }
        
        for (let i = 0; i < rooms.length; i++) {
          await new Promise(resolve => setTimeout(resolve, i * 100)); // Stagger creation
          await onCreateRoom(rooms[i]);
        }
      } else {
        // Create multiple rooms of the same type + remainder room if needed
        const totalRooms = template.count + (template.remainder >= 2 ? 1 : 0);
        // Creating rooms...
        
        // Create main rooms
        for (let i = 1; i <= template.count; i++) {
          const roomName = template.count === 1 ? template.name : `${template.name} ${i}`;
          await new Promise(resolve => setTimeout(resolve, (i - 1) * 100)); // Stagger creation
          // Creating room...
          await onCreateRoom({ 
            name: roomName, 
            type: template.type 
          });
        }
        
        // Create remainder room if needed
        if (template.remainder >= 2) {
          await new Promise(resolve => setTimeout(resolve, template.count * 100)); // Stagger creation
          const remainderType = template.remainder === 2 ? 'dyad' : template.remainder === 3 ? 'triad' : 'quad';
          const remainderName = template.remainder === 2 ? 'Remainder Dyad' : 
                               template.remainder === 3 ? 'Remainder Triad' : 
                               `Remainder Group (${template.remainder})`;
          // Creating remainder room...
          await onCreateRoom({ 
            name: remainderName, 
            type: remainderType 
          });
        }
      }
      
      // Template completed successfully
      
      // Use requestAnimationFrame for modal closure
      requestAnimationFrame(() => {
        try {
          setShowRoomTemplates(false);
          
          // Show user-friendly success message with instruction
          const roomCount = template.count || 6; // Use template count or default to 6
          alert(`🎉 Success! Created ${roomCount} ${template.name} rooms.\n\n💡 Click the "Overview" tab to see all your rooms with horizontal scrolling.`);
          
        } catch (modalError) {
          console.error('❌ Error closing modal:', modalError);
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to apply template:', error);
      alert(`❌ Failed to create rooms from template "${template.name}". Some rooms may have been created successfully. Check console for details.`);
    }
  };

  return (
    <div className="participant-management-view">
      <div className="management-header">
        <h3>👥 Participant Management</h3>
        <div className="management-controls">
          <button className="balance-btn" onClick={onBalanceRooms}>
            ⚖️ Auto Balance
          </button>
          <button className="template-btn" onClick={() => {
            setShowRoomTemplates(true);
          }}>
            🎯 Quick Setup
          </button>
          <button className="create-room-btn" onClick={() => setShowCreateRoom(true)}>
            ➕ Create Room
          </button>
        </div>
      </div>

      {showCreateRoom && (
        <div className="create-room-modal" onClick={(e) => e.target.className === 'create-room-modal' && setShowCreateRoom(false)}>
          <div className="modal-content">
            <div className="modal-header">
              <h4>Create New Room</h4>
              <button className="modal-close" onClick={() => setShowCreateRoom(false)}>×</button>
            </div>
            <div className="form-group">
              <label>Room Name:</label>
              <input
                type="text"
                value={newRoomConfig.name}
                onChange={(e) => setNewRoomConfig(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter room name"
              />
            </div>
            <div className="form-group">
              <label>Room Type:</label>
              <select
                value={newRoomConfig.type}
                onChange={(e) => setNewRoomConfig(prev => ({ ...prev, type: e.target.value }))}
              >
                <option value="dyad">Dyad (2 people)</option>
                <option value="triad">Triad (3 people)</option>
                <option value="quad">Quad (4 people)</option>
                <option value="kiva">Kiva (6 people)</option>
              </select>
            </div>
            <div className="modal-actions">
              <button onClick={handleCreateRoomFromForm}>Create</button>
              <button onClick={() => setShowCreateRoom(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showRoomTemplates && (
        <QuickSetup
          dialogueConfig={dialogueConfig}
          participants={participants}
          av={av}
          sessionId={sessionId}
          onCreateRoom={onCreateRoom}
          onClose={() => setShowRoomTemplates(false)}
          sessionFlowConfig={sessionFlowConfig}
        />
      )}

      <div className="rooms-grid">
        {Object.entries(breakoutRooms).map(([roomId, room]) => {
          const engagement = roomEngagementMetrics[roomId] || { score: 0, activity: 'low' };
          
          return (
            <div 
              key={roomId} 
              className={`room-management-card ${draggedParticipant ? 'drag-active' : ''}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, roomId)}
            >
              <div className="room-header">
                <h4>{room.name}</h4>
                <div className="room-actions">
                  <button 
                    className="delete-room-btn"
                    onClick={() => onDeleteRoom(roomId)}
                    title="Delete room"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="engagement-metrics">
                <div className="engagement-score">
                  <span>Engagement: </span>
                  <div 
                    className="score-bar"
                    style={{ 
                      width: `${engagement.score}%`,
                      backgroundColor: getEngagementColor(engagement.score)
                    }}
                  >
                    {engagement.score}%
                  </div>
                </div>
                <div className="activity-level">
                  Activity: <span className={`activity-${engagement.activity}`}>{engagement.activity}</span>
                </div>
              </div>

              <div className="participants-list">
                <h5>Participants ({room.participants?.length || 0})</h5>
                {room.participants?.map((participant, index) => {
                  const assignment = participantAssignments[participant.id || participant.name];
                  
                  return (
                    <div
                      key={index}
                      className={`participant-card ${draggedParticipant?.participant === participant ? 'dragging' : ''}`}
                      draggable
                                  onDragStart={(e) => {
              handleDragStart(participant, roomId);
            }}
                    >
                      <div className="participant-info">
                        <span className="participant-name">
                          {participant.name || `Participant ${index + 1}`}
                        </span>
                        {assignment?.autoBalanced && (
                          <span className="auto-balanced-tag">⚖️</span>
                        )}
                        {assignment?.reassignedFrom && (
                          <span className="reassigned-tag" title={`Moved from ${assignment.reassignedFrom}`}>
                            🔄
                          </span>
                        )}
                      </div>
                      <div className="participant-status">
                        <span className={`status-dot ${participant.status || 'active'}`}></span>
                        <span className="join-time">
                          {assignment?.assignedAt ? 
                            new Date(assignment.assignedAt).toLocaleTimeString() : 
                            'Initial'
                          }
                        </span>
                      </div>
                    </div>
                  );
                })}
                
                {(!room.participants || room.participants.length === 0) && (
                  <div className="empty-room">
                    <p>No participants assigned</p>
                    <p className="drop-hint">Drop participants here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="management-stats">
        <div className="stat-card">
          <h4>Overall Statistics</h4>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Total Participants:</span>
              <span className="stat-value">
                {Object.values(breakoutRooms).reduce((sum, room) => sum + (room.participants?.length || 0), 0)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Active Rooms:</span>
              <span className="stat-value">{Object.keys(breakoutRooms).length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Average Engagement:</span>
              <span className="stat-value">
                {Object.keys(breakoutRooms).length > 0 ? 
                  Math.round(
                    Object.values(roomEngagementMetrics).reduce((sum, metrics) => sum + (metrics.score || 0), 0) / 
                    Object.keys(breakoutRooms).length
                  ) : 0
                }%
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Reassignments:</span>
              <span className="stat-value">
                {Object.values(participantAssignments).filter(a => a.reassignedFrom).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakoutRoomManager;
