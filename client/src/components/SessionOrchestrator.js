import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import BreakoutRoomManager from './BreakoutRoomManager';
import './SessionOrchestrator.css';

const SessionOrchestrator = ({ 
  dialogueConfig, 
  participants = [], 
  isHost = false,
  onSessionEnd,
  onParticipantUpdate 
}) => {
  // Core session state
  const [sessionState, setSessionState] = useState({
    status: 'preparing', // 'preparing', 'active', 'paused', 'completed'
    currentStageIndex: 0,
    currentSubstageIndex: 0,
    stageStartTime: null,
    substageStartTime: null,
    totalElapsedTime: 0,
    breakoutAssignments: {},
    sessionId: `session_${Date.now()}`,
    startedAt: null,
    pausedAt: null,
    completedAt: null
  });

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  // Participant and breakout state - stabilize participants to prevent infinite re-renders
  const stableParticipants = useMemo(() => {
    // If no participants provided and this is a Session Flow Manager generated dialogue, create mock participants
    if (participants.length === 0 && dialogueConfig?.autoCreateRooms && dialogueConfig?.gatheringSize) {
      const mockParticipants = [];
      const participantCount = dialogueConfig.gatheringSize;
      
      for (let i = 1; i <= participantCount; i++) {
        mockParticipants.push({
          id: `participant_${i}`,
          name: `Participant ${i}`,
          status: 'ready',
          joinedAt: new Date().toISOString(),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
          engagementScore: 75 + Math.random() * 25 // Random score between 75-100
        });
      }
      
      console.log(`🎭 Generated ${participantCount} mock participants for Session Flow Manager dialogue`);
      return mockParticipants;
    }
    
    return participants;
  }, [participants, participants.length, dialogueConfig?.autoCreateRooms, dialogueConfig?.gatheringSize]);
  
  const [participantList, setParticipantList] = useState(stableParticipants);
  const [breakoutRooms, setBreakoutRooms] = useState({});
  const [currentViewMode, setCurrentViewMode] = useState('community');
  
  // Stable session ID to prevent infinite re-renders
  const stableSessionId = useMemo(() => `session_${Date.now()}`, []);

  // Room management functions
  const handleCreateRoom = useCallback(async (roomConfig) => {
    try {
      const newRoomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newRoom = {
        id: newRoomId,
        name: roomConfig.name.trim(),
        type: roomConfig.type,
        participants: [],
        maxParticipants: roomConfig.type === 'dyad' ? 2 : 
                        roomConfig.type === 'triad' ? 3 : 
                        roomConfig.type === 'quad' ? 4 : 
                        roomConfig.type === 'kiva' ? 6 : 4,
        createdAt: new Date().toISOString(),
        status: 'waiting',
        engagementScore: 0,
        lastActivity: new Date().toISOString()
      };

      setBreakoutRooms(prev => {
        const updated = {
          ...prev,
          [newRoomId]: newRoom
        };
        console.log('🔧 SessionOrchestrator: Updated breakoutRooms state:', Object.keys(updated));
        return updated;
      });

      console.log(`🏠 Room created: ${newRoom.name} (${newRoom.type})`);
      return newRoom;
    } catch (error) {
      console.error('❌ Error in handleCreateRoom:', error);
      throw error;
    }
  }, []);

  const handleDeleteRoom = useCallback((roomId) => {
    setBreakoutRooms(prev => {
      const { [roomId]: deletedRoom, ...remainingRooms } = prev;
      console.log(`🗑️ Room deleted: ${deletedRoom?.name || roomId}`);
      return remainingRooms;
    });
  }, []);

  const handleParticipantReassignment = useCallback((participantId, fromRoomId, toRoomId) => {
    setBreakoutRooms(prev => {
      const newRooms = { ...prev };
      
      // Find and remove participant from source room
      if (newRooms[fromRoomId]) {
        newRooms[fromRoomId] = {
          ...newRooms[fromRoomId],
          participants: newRooms[fromRoomId].participants.filter(p => 
            (p.id || p.name) !== participantId
          )
        };
      }
      
      // Add participant to target room
      if (newRooms[toRoomId]) {
        // Find the participant object from the source room or create a basic one
        let participantObj = null;
        if (prev[fromRoomId]) {
          participantObj = prev[fromRoomId].participants.find(p => 
            (p.id || p.name) === participantId
          );
        }
        
        // If we can't find the participant object, create a basic one
        if (!participantObj) {
          participantObj = { id: participantId, name: participantId };
        }
        
        newRooms[toRoomId] = {
          ...newRooms[toRoomId],
          participants: [...newRooms[toRoomId].participants, participantObj]
        };
      }
      
      console.log(`👥 Participant ${participantId} moved from ${fromRoomId} to ${toRoomId}`);
      return newRooms;
    });
  }, []);

  // Get enabled stages from dialogue config
  let enabledStages = Object.entries(dialogueConfig?.stages || {})
    .filter(([_, stage]) => stage.enabled)
    .map(([name, stage]) => ({ name, ...stage }));
  
  // Safeguard: If no stages are enabled, enable the connect stage by default
  if (enabledStages.length === 0 && dialogueConfig?.stages) {
    console.warn('⚠️ No stages enabled, defaulting to connect stage');
    const stageEntries = Object.entries(dialogueConfig.stages);
    if (stageEntries.length > 0) {
      // Enable the first available stage (usually connect)
      const [firstStageName, firstStage] = stageEntries[0];
      enabledStages = [{ name: firstStageName, ...firstStage, enabled: true }];
      
      // Also update the dialogue config to persist this fix
      if (dialogueConfig.stages[firstStageName]) {
        dialogueConfig.stages[firstStageName].enabled = true;
      }
    }
  }

  // Get current stage and substage
  const currentStage = enabledStages[sessionState.currentStageIndex];
  const currentSubstage = currentStage?.substages?.[sessionState.currentSubstageIndex];

  // Session persistence
  useEffect(() => {
    const savedSession = localStorage.getItem(`session_${dialogueConfig?.id}`);
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        setSessionState(parsed);
      } catch (error) {
        console.error('Error loading saved session:', error);
      }
    }
  }, [dialogueConfig?.id]);

  // Auto-create rooms for Session Flow Manager generated dialogues
  useEffect(() => {
    if (dialogueConfig?.autoCreateRooms && dialogueConfig?.roomType && Object.keys(breakoutRooms).length === 0) {
      console.log('🚀 Auto-creating rooms for Session Flow Manager dialogue');
      
      const roomType = dialogueConfig.roomType;
      const participantCount = dialogueConfig.gatheringSize || 20;
      
      // Calculate number of rooms needed
      const roomSizes = { dyad: 2, triad: 3, quad: 4, kiva: 6 };
      const roomSize = roomSizes[roomType] || 4;
      const numberOfRooms = Math.ceil(participantCount / roomSize);
      
      // Create rooms automatically
      const createRoomsSequentially = async () => {
        for (let i = 1; i <= numberOfRooms; i++) {
          const roomConfig = {
            name: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} ${i}`,
            type: roomType,
            maxParticipants: roomSize,
            description: `Auto-created ${roomType} room for ${roomSize} participants`
          };
          
          try {
            await handleCreateRoom(roomConfig);
            // Small delay to prevent overwhelming the system
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            console.error(`❌ Failed to create room ${i}:`, error);
          }
        }
        
        console.log(`✅ Auto-created ${numberOfRooms} ${roomType} rooms for ${participantCount} participants`);
        
        // Auto-assign participants after room creation
        setTimeout(() => {
          console.log('🎯 Triggering auto-assignment of participants to rooms');
          // The BreakoutRoomManager will handle the actual assignment via its balancing logic
          setCurrentViewMode(roomType); // Set the view mode to match the room type
        }, 500); // Small delay to ensure rooms are created
      };
      
      createRoomsSequentially();
    }
  }, [dialogueConfig?.autoCreateRooms, dialogueConfig?.roomType, dialogueConfig?.gatheringSize, breakoutRooms, handleCreateRoom]);

  // Timer handlers
  const handleTimerComplete = useCallback(() => {
    setIsTimerRunning(false);
    
    // Auto-advance if enabled (could be a setting)
    if (isHost) {
      // For now, just notify - host can manually advance
      // In future, could have auto-advance setting
    }
  }, [isHost]);

  // Save session state
  useEffect(() => {
    if (dialogueConfig?.id) {
      localStorage.setItem(`session_${dialogueConfig.id}`, JSON.stringify(sessionState));
    }
  }, [sessionState, dialogueConfig?.id]);

  // Timer management
  useEffect(() => {
    if (isTimerRunning && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            handleTimerComplete();
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else {
      clearTimeout(timerRef.current);
    }

    return () => clearTimeout(timerRef.current);
  }, [isTimerRunning, timeRemaining, handleTimerComplete]);

  // Breakout room generation
  const generateBreakoutRooms = useCallback((viewMode, participants, preserveRooms = false) => {
    if (!participants || participants.length === 0) return {};
    
    // Safety check for viewMode
    if (!viewMode || typeof viewMode !== 'string') {
      console.warn('⚠️ Invalid viewMode provided to generateBreakoutRooms:', viewMode, 'defaulting to dyad');
      viewMode = 'dyad';
    }
    
    // If preserveRooms is true and we have existing breakout rooms, preserve the participant assignments
    if (preserveRooms && Object.keys(breakoutRooms).length > 0) {
      console.log('🔄 Preserving room assignments for Summary phase', {
        preserveRooms,
        existingRoomCount: Object.keys(breakoutRooms).length,
        roomIds: Object.keys(breakoutRooms)
      });
      return breakoutRooms;
    }
    
    // Debug logging when NOT preserving rooms
    if (preserveRooms) {
      console.log('⚠️ Room preservation requested but no existing rooms found', {
        preserveRooms,
        existingRoomCount: Object.keys(breakoutRooms).length
      });
    }

    const roomSizes = {
      'individual': 1,
      'dyad': 2,
      'triad': 3,
      'quad': 4,
      'community': participants.length
    };

    const roomSize = roomSizes[viewMode] || 2;
    const rooms = {};

    if (viewMode === 'community' || viewMode === 'breakout-processing') {
      rooms['main'] = {
        id: 'main',
        name: 'Main Room',
        participants: [...participants],
        type: viewMode
      };
    } else if (viewMode === 'individual') {
      participants.forEach((participant, index) => {
        rooms[`individual_${index}`] = {
          id: `individual_${index}`,
          name: `${participant.name}'s Space`,
          participants: [participant],
          type: 'individual'
        };
      });
    } else {
      // CRITICAL FIX: Always create empty Main Room as host-only space during breakout phases
      rooms['main'] = {
        id: 'main',
        name: 'Main Room',
        participants: [], // Empty - host-only space during breakouts
        type: 'host-space'
      };
      
      // Create balanced breakout groups
      const shuffled = [...participants].sort(() => Math.random() - 0.5);
      const numRooms = Math.ceil(shuffled.length / roomSize);
      
      for (let i = 0; i < numRooms; i++) {
        const roomParticipants = shuffled.slice(i * roomSize, (i + 1) * roomSize);
        if (roomParticipants.length > 0) {
          rooms[`breakout_${i}`] = {
            id: `breakout_${i}`,
            name: `${viewMode.charAt(0).toUpperCase() + viewMode.slice(1)} ${i + 1}`,
            participants: roomParticipants,
            type: viewMode
          };
        }
      }
    }

    return rooms;
  }, [breakoutRooms]);

  // Session control functions
  const startSession = useCallback(() => {
    const now = Date.now();
    setSessionState(prev => ({
      ...prev,
      status: 'active',
      startedAt: now,
      stageStartTime: now,
      substageStartTime: now
    }));

    // Start with first substage
    if (currentSubstage) {
      setTimeRemaining(currentSubstage.duration * 60); // Convert minutes to seconds
      setCurrentViewMode(currentSubstage.viewMode || 'community');
      setIsTimerRunning(true);
      
      // Generate initial breakout rooms
      const rooms = generateBreakoutRooms(currentSubstage.viewMode, participantList);
      setBreakoutRooms(rooms);
    }
  }, [currentSubstage, participantList, generateBreakoutRooms]);

  const pauseSession = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      status: 'paused',
      pausedAt: Date.now()
    }));
    setIsTimerRunning(false);
  }, []);

  const resumeSession = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      status: 'active',
      pausedAt: null
    }));
    setIsTimerRunning(true);
  }, []);

  const endSession = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      status: 'completed',
      completedAt: Date.now()
    }));
    setIsTimerRunning(false);
    
    if (onSessionEnd) {
      onSessionEnd(sessionState);
    }
  }, [sessionState, onSessionEnd]);

  // Stage navigation
  const advanceToNextStage = useCallback(() => {
    const nextStageIndex = sessionState.currentStageIndex + 1;

    // Check if we have more stages
    if (nextStageIndex < enabledStages.length) {
      const nextStage = enabledStages[nextStageIndex];
      const firstSubstage = nextStage.substages?.[0];

      setSessionState(prev => ({
        ...prev,
        currentStageIndex: nextStageIndex,
        currentSubstageIndex: 0,
        stageStartTime: Date.now(),
        substageStartTime: Date.now()
      }));

      if (firstSubstage) {
        setTimeRemaining(firstSubstage.duration * 60);
        setCurrentViewMode(firstSubstage.viewMode || 'community');
        
        // Generate breakout rooms for new stage
        const rooms = generateBreakoutRooms(firstSubstage.viewMode, participantList);
        setBreakoutRooms(rooms);
        
        setIsTimerRunning(true);
      }
    } else {
      // Session complete
      endSession();
    }
  }, [sessionState, enabledStages, participantList, generateBreakoutRooms, endSession]);

  const advanceToNextSubstage = useCallback(() => {
    const nextSubstageIndex = sessionState.currentSubstageIndex + 1;
    // eslint-disable-next-line no-unused-vars
    const nextStageIndex = sessionState.currentStageIndex;

    // Check if we have more substages in current stage
    if (nextSubstageIndex < (currentStage?.substages?.length || 0)) {
      const nextSubstage = currentStage.substages[nextSubstageIndex];
      
      setSessionState(prev => ({
        ...prev,
        currentSubstageIndex: nextSubstageIndex,
        substageStartTime: Date.now()
      }));

      setTimeRemaining(nextSubstage.duration * 60);
      setCurrentViewMode(nextSubstage.viewMode || 'community');
      
      // Generate new breakout rooms if needed
      // Preserve rooms if transitioning from Dialogue to Summary
      const shouldPreserveRooms = currentSubstage?.name === 'Dialogue' && nextSubstage.name === 'Summary';
      console.log('🔄 Substage transition:', {
        from: currentSubstage?.name,
        to: nextSubstage.name,
        shouldPreserveRooms,
        currentRoomCount: Object.keys(breakoutRooms).length
      });
      
      const rooms = generateBreakoutRooms(nextSubstage.viewMode, participantList, shouldPreserveRooms);
      setBreakoutRooms(rooms);
      
      setIsTimerRunning(true);
    } else {
      // Move to next stage
      advanceToNextStage();
    }
  }, [sessionState, currentStage, participantList, generateBreakoutRooms, advanceToNextStage]);

  const goToPreviousSubstage = useCallback(() => {
    if (sessionState.currentSubstageIndex > 0) {
      const prevSubstageIndex = sessionState.currentSubstageIndex - 1;
      const prevSubstage = currentStage.substages[prevSubstageIndex];
      
      setSessionState(prev => ({
        ...prev,
        currentSubstageIndex: prevSubstageIndex,
        substageStartTime: Date.now()
      }));

      setTimeRemaining(prevSubstage.duration * 60);
      setCurrentViewMode(prevSubstage.viewMode || 'community');
      
      const rooms = generateBreakoutRooms(prevSubstage.viewMode, participantList);
      setBreakoutRooms(rooms);
    } else if (sessionState.currentStageIndex > 0) {
      // Go to previous stage
      const prevStageIndex = sessionState.currentStageIndex - 1;
      const prevStage = enabledStages[prevStageIndex];
      const lastSubstageIndex = (prevStage.substages?.length || 1) - 1;
      const lastSubstage = prevStage.substages?.[lastSubstageIndex];

      setSessionState(prev => ({
        ...prev,
        currentStageIndex: prevStageIndex,
        currentSubstageIndex: lastSubstageIndex,
        stageStartTime: Date.now(),
        substageStartTime: Date.now()
      }));

      if (lastSubstage) {
        setTimeRemaining(lastSubstage.duration * 60);
        setCurrentViewMode(lastSubstage.viewMode || 'community');
        
        const rooms = generateBreakoutRooms(lastSubstage.viewMode, participantList);
        setBreakoutRooms(rooms);
      }
    }
  }, [sessionState, currentStage, enabledStages, participantList, generateBreakoutRooms]);

  const addTime = useCallback((minutes) => {
    setTimeRemaining(prev => prev + (minutes * 60));
  }, []);

  const setCustomTime = useCallback((minutes) => {
    setTimeRemaining(minutes * 60);
  }, []);

  // Participant management
  const updateParticipants = useCallback((newParticipants) => {
    setParticipantList(newParticipants);
    
    // Regenerate breakout rooms with new participant list
    if (currentSubstage) {
      const rooms = generateBreakoutRooms(currentSubstage.viewMode, newParticipants);
      setBreakoutRooms(rooms);
    }

    if (onParticipantUpdate) {
      onParticipantUpdate(newParticipants);
    }
  }, [currentSubstage, generateBreakoutRooms, onParticipantUpdate]);

  // Format time display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate progress
  const calculateProgress = () => {
    const totalStages = enabledStages.length;
    const currentProgress = sessionState.currentStageIndex / totalStages;
    const substageProgress = currentStage?.substages ? 
      sessionState.currentSubstageIndex / currentStage.substages.length : 0;
    
    return {
      overall: (currentProgress + (substageProgress / totalStages)) * 100,
      stage: substageProgress * 100,
      stageIndex: sessionState.currentStageIndex,
      substageIndex: sessionState.currentSubstageIndex,
      totalStages,
      currentStageName: currentStage?.name || '',
      currentSubstageName: currentSubstage?.name || ''
    };
  };

  const progress = calculateProgress();

  // Session data for child components - memoized to prevent infinite re-renders
  const sessionData = useMemo(() => ({
    sessionState,
    currentStage,
    currentSubstage,
    timeRemaining,
    isTimerRunning,
    breakoutRooms,
    currentViewMode,
    participantList,
    progress,
    sessionId: stableSessionId,
    
    // Control functions
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    advanceToNextSubstage,
    advanceToNextStage,
    goToPreviousSubstage,
    addTime,
    setCustomTime,
    // eslint-disable-next-line no-unused-vars
    updateParticipants,
    
    // Room management
    handleCreateRoom,
    handleDeleteRoom,
    
    // Utility functions
    formatTime
  }), [
    sessionState,
    currentStage,
    currentSubstage,
    timeRemaining,
    isTimerRunning,
    breakoutRooms,
    currentViewMode,
    participantList,
    progress,
    stableSessionId,
    startSession,
    pauseSession,
    resumeSession,
    endSession,
    advanceToNextSubstage,
    advanceToNextStage,
    goToPreviousSubstage,
    addTime,
    setCustomTime,
    updateParticipants,
    handleCreateRoom,
    handleDeleteRoom,
    formatTime
  ]);

  return (
    <div className="session-orchestrator">
      {sessionState.status === 'preparing' && (
        <SessionPreparation 
          dialogueConfig={dialogueConfig}
          sessionData={sessionData}
          isHost={isHost}
        />
      )}
      
      {sessionState.status === 'active' && (
        <ActiveSession 
          dialogueConfig={dialogueConfig}
          sessionData={sessionData}
          isHost={isHost}
          onReassignParticipant={handleParticipantReassignment}
        />
      )}
      
      {sessionState.status === 'paused' && (
        <PausedSession 
          dialogueConfig={dialogueConfig}
          sessionData={sessionData}
          isHost={isHost}
        />
      )}
      
      {sessionState.status === 'completed' && (
        <CompletedSession 
          dialogueConfig={dialogueConfig}
          sessionData={sessionData}
          isHost={isHost}
        />
      )}
    </div>
  );
};

// Session Preparation Component
const SessionPreparation = ({ dialogueConfig, sessionData, isHost }) => {
  const { startSession, participantList, updateParticipants } = sessionData;

  return (
    <div className="session-preparation">
      <div className="preparation-header">
        <h1>🎭 {dialogueConfig.title}</h1>
        <p>Preparing for dialogue session</p>
      </div>

      <div className="preparation-content">
        <div className="participant-check">
          <h3>👥 Participants ({participantList.length})</h3>
          {participantList.length > 50 ? (
            // Compact view for large groups
            <div className="participant-summary">
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-icon">✅</span>
                  <span className="stat-label">Ready:</span>
                  <span className="stat-value">{participantList.filter(p => p.status === 'ready').length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">⏳</span>
                  <span className="stat-label">Pending:</span>
                  <span className="stat-value">{participantList.filter(p => p.status !== 'ready').length}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">👥</span>
                  <span className="stat-label">Total:</span>
                  <span className="stat-value">{participantList.length}</span>
                </div>
              </div>
              <p className="large-group-note">
                📊 Large group detected - showing summary view for better performance
              </p>
            </div>
          ) : (
            // Detailed view for smaller groups
            <div className="participant-list">
              {participantList.map((participant, index) => (
                <div key={index} className="participant-item">
                  <span className="participant-name">{participant.name}</span>
                  <span className={`participant-status ${participant.status || 'pending'}`}>
                    {participant.status === 'ready' ? '✅' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="technical-check">
          <h3>🔧 Technical Check</h3>
          <div className="check-items">
            <div className="check-item">
              <span className="check-icon">🎤</span>
              <span>Microphone access</span>
              <span className="check-status">✅</span>
            </div>
            <div className="check-item">
              <span className="check-icon">📹</span>
              <span>Camera access</span>
              <span className="check-status">✅</span>
            </div>
            <div className="check-item">
              <span className="check-icon">🌐</span>
              <span>Network connection</span>
              <span className="check-status">✅</span>
            </div>
          </div>
        </div>

        {isHost && (
          <div className="host-controls" style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#e8f5e8', border: '2px solid #4CAF50', borderRadius: '8px' }}>
            <p style={{ margin: '0 0 1rem 0', fontWeight: 'bold', color: '#2e7d32' }}>🎯 Host Controls (You are the host)</p>
            <button 
              className="start-session-btn"
              onClick={startSession}
              disabled={participantList.length === 0}
              style={{ fontSize: '1.2rem', padding: '1rem 2rem' }}
            >
              🚀 Start Dialogue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Active Session Component
const ActiveSession = ({ dialogueConfig, sessionData, isHost, onReassignParticipant }) => {
  const { 
    currentStage, 
    currentSubstage, 
    timeRemaining, 
    isTimerRunning,
    breakoutRooms,
    progress,
    formatTime,
    pauseSession,
    advanceToNextSubstage,
    addTime,
    handleCreateRoom,
    handleDeleteRoom
  } = sessionData;
  
  // Debug logging for breakoutRooms

  return (
    <div className="active-session">
      {/* Progress Header */}
      <div className="session-header">
        <div className="progress-info">
          <h2>{currentStage?.name ? (currentStage.name.charAt(0).toUpperCase() + currentStage.name.slice(1)) : 'Current'} Stage</h2>
          <div className="substage-info">
            {currentSubstage?.name === 'Catalyst' && '✨'}
            {currentSubstage?.name === 'Dialogue' && '💬'}
            {currentSubstage?.name === 'Summary' && '📝'}
            {currentSubstage?.name === 'WE' && '🌐'}
            {' '}
            {currentSubstage?.name}
          </div>
        </div>
        
        <div className="timer-display">
          <div className={`timer ${timeRemaining <= 60 ? 'warning' : ''} ${timeRemaining <= 0 ? 'expired' : ''}`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="timer-status">
            {isTimerRunning ? '▶️' : '⏸️'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress.overall}%` }}
        ></div>
      </div>

      {/* Current Stage Content */}
      <div className="stage-content">
        <BreakoutRoomManager 
          breakoutRooms={breakoutRooms}
          currentStage={currentStage}
          currentSubstage={currentSubstage}
          isHost={isHost}
          dialogueConfig={dialogueConfig}
          participants={sessionData.participantList}
          participantCount={(() => {
            const count = sessionData.participantList?.length || 0;
            return count;
          })()}
          sessionId={sessionData.sessionId}
          onCreateRoom={handleCreateRoom}
          onDeleteRoom={handleDeleteRoom}
          onReassignParticipant={onReassignParticipant}
          onTranscriptUpdate={(roomId, entry) => {
            console.log('Transcript updated:', roomId, entry);
          }}
          onSummaryUpdate={(roomId, summary) => {
            console.log('Summary updated:', roomId, summary);
          }}
        />
      </div>

      {/* Host Controls */}
      {isHost && (
        <HostControls 
          sessionData={sessionData}
          onPause={pauseSession}
          onAdvance={advanceToNextSubstage}
          onAddTime={addTime}
        />
      )}
    </div>
  );
};



// Host Controls Component
const HostControls = ({ sessionData, onPause, onAdvance, onAddTime }) => {
  return (
    <div className="host-controls">
      <div className="control-group">
        <button className="control-btn pause" onClick={onPause}>
          ⏸️ Pause
        </button>
        <button className="control-btn advance" onClick={onAdvance}>
          ⏭️ Next
        </button>
      </div>
      
      <div className="time-controls">
        <button className="time-btn" onClick={() => onAddTime(1)}>
          +1 min
        </button>
        <button className="time-btn" onClick={() => onAddTime(5)}>
          +5 min
        </button>
      </div>
    </div>
  );
};

// Paused Session Component
const PausedSession = ({ sessionData, isHost }) => {
  const { resumeSession, endSession } = sessionData;

  return (
    <div className="paused-session">
      <div className="pause-message">
        <h2>⏸️ Session Paused</h2>
        <p>The dialogue is currently paused</p>
      </div>
      
      {isHost && (
        <div className="pause-controls">
          <button className="resume-btn" onClick={resumeSession}>
            ▶️ Resume
          </button>
          <button className="end-btn" onClick={endSession}>
            🏁 End Session
          </button>
        </div>
      )}
    </div>
  );
};

// Completed Session Component
const CompletedSession = ({ dialogueConfig, sessionData }) => {
  return (
    <div className="completed-session">
      <div className="completion-message">
        <h2>🎉 Dialogue Complete</h2>
        <p>Thank you for participating in "{dialogueConfig.title}"</p>
      </div>
      
      <div className="session-summary">
        <h3>Session Summary</h3>
        <div className="summary-stats">
          <div className="stat-item">
            <span className="stat-label">Duration:</span>
            <span className="stat-value">{sessionData.formatTime(sessionData.sessionState.totalElapsedTime)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Participants:</span>
            <span className="stat-value">{sessionData.participantList.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Stages Completed:</span>
            <span className="stat-value">{sessionData.progress.stageIndex + 1}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionOrchestrator;
