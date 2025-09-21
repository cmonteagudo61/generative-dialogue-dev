import React, { useState, useEffect } from 'react';
import DialogueManager from './DialogueManager';
import SessionOrchestrator from './SessionOrchestrator';
import SessionFlowManager from './SessionFlowManager';
import QuickDialogueSetup from './QuickDialogueSetup';
import RoomAssignmentManager from './RoomAssignmentManager';
import { buildApiUrl } from '../config/api';
import { roomManager } from '../services/RoomManager';
import { ROOM_TYPES } from '../config/roomConfig';
import './SimpleDashboard.css';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('🚨 React Error Boundary caught:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError({
        time: new Date().toLocaleTimeString(),
        error: error.message || 'React component error',
        type: 'react_error'
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', background: '#ffe6e6' }}>
          <h3>Something went wrong</h3>
          <p>{this.state.error?.message}</p>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const SimpleDashboard = ({ sessionData = null }) => {
  const [currentView, setCurrentView] = useState(sessionData ? 'live-session' : 'overview'); // 'overview', 'dialogues', or 'live-session'
  const [dashboardMode, setDashboardMode] = useState('configuration'); // 'configuration', 'live', 'analysis', 'developer'
  const [developerAccess, setDeveloperAccess] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [selectedDialogue, setSelectedDialogue] = useState(sessionData || null);
  const [showQuickSetup, setShowQuickSetup] = useState(false);
  
  // Session Management State
  const [sessionCode, setSessionCode] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [isHost, setIsHost] = useState(true);
  const [showSessionJoin, setShowSessionJoin] = useState(false);

  // Load existing session data on mount
  useEffect(() => {
    // Check URL parameters for session code
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionCode = urlParams.get('session');
    
    if (urlSessionCode) {
      // Load specific session from URL
      const sessionData = localStorage.getItem(`session_${urlSessionCode}`);
      if (sessionData) {
        const session = JSON.parse(sessionData);
        console.log('🔄 Loading session from URL:', urlSessionCode, session);
        setSessionCode(urlSessionCode);
        setParticipants(session.participants || []);
        return;
      }
    }
    
    // Otherwise, check for any existing host sessions
    const allKeys = Object.keys(localStorage);
    const sessionKeys = allKeys.filter(key => key.startsWith('session_'));
    
    for (const key of sessionKeys) {
      try {
        const sessionData = localStorage.getItem(key);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          // Check if this user is the host of this session
          const hostParticipant = session.participants?.find(p => p.isHost);
          if (hostParticipant) {
            const code = key.replace('session_', '');
            console.log('🔄 Loading existing host session:', code, session);
            setSessionCode(code);
            setParticipants(session.participants || []);
            break; // Load the first host session found
          }
        }
      } catch (error) {
        console.log('⚠️ Error loading session from', key, error);
      }
    }
  }, []);

  // Flash detection system removed - issue resolved with webpack overlay blocking
  const [systemHealth, setSystemHealth] = useState({
    backend: 'checking...',
    database: 'checking...',
    services: 'checking...'
  });
  const [mockData] = useState({
    totalParticipants: 0,
    activeParticipants: 0,
    deviceBreakdown: { mobile: 2, tablet: 1, desktop: 3 },
    connectionQuality: { good: 5, fair: 1, poor: 0 }
  });

  // All debug monitoring removed - flash issue resolved

  // Check system health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(buildApiUrl('/health'), {
          headers: {
            'ngrok-skip-browser-warning': 'true'
          }
        });
        const health = await response.json();
        const newHealth = {
          backend: 'online',
          database: health.mongo === 'connected' ? 'connected' : 'disconnected',
          services: `${Object.keys(health).filter(k => k !== 'status' && k !== 'timestamp' && health[k] === 'configured').length} services`
        };
        
        // Only update if health status actually changed to prevent unnecessary re-renders
        setSystemHealth(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(newHealth)) {
            return newHealth;
          }
          return prev;
        });
      } catch (error) {
        const errorHealth = {
          backend: 'offline',
          database: 'unknown',
          services: 'unavailable'
        };
        
        // Only update if health status actually changed
        setSystemHealth(prev => {
          if (JSON.stringify(prev) !== JSON.stringify(errorHealth)) {
            return errorHealth;
          }
          return prev;
        });
        
                // Silent error handling - health check failures are normal
      }
    };

    checkHealth();
    // Reduced frequency to minimize console errors
    const interval = setInterval(checkHealth, 30000); // 30 seconds instead of 10
    return () => clearInterval(interval);
  }, []);

  // Poll for session participant updates + listen for storage events
  useEffect(() => {
    if (!sessionCode) return;

    let lastParticipantCount = 0;
    let lastParticipantNames = '';

    const pollParticipants = () => {
      try {
        const key = `session_${sessionCode}`;
        const sessionData = localStorage.getItem(key);
        
        if (sessionData) {
          const session = JSON.parse(sessionData);
          const currentCount = session.participants.length;
          const currentNames = session.participants.map(p => p.name).sort().join(',');
          
          // Only log when there are actual changes
          if (currentCount !== lastParticipantCount || currentNames !== lastParticipantNames) {
            console.log('📊 Host dashboard: Participants updated:', currentCount, 'Names:', session.participants.map(p => p.name));
            lastParticipantCount = currentCount;
            lastParticipantNames = currentNames;
          }
          
          setParticipants(session.participants);
        } else {
          // Only log missing data once
          if (lastParticipantCount > 0) {
            console.log('❌ Host dashboard: Session data lost for key:', key);
            lastParticipantCount = 0;
            lastParticipantNames = '';
          }
        }
      } catch (error) {
        console.error('Error polling participants:', error);
      }
    };

    // Listen for storage events (cross-tab communication)
    const handleStorageChange = (e) => {
      if (e.key === `session_${sessionCode}` && e.newValue) {
        try {
          const session = JSON.parse(e.newValue);
          console.log('🔄 Host dashboard: Storage event - participants updated:', session.participants.length);
          setParticipants(session.participants);
          // Update tracking variables
          lastParticipantCount = session.participants.length;
          lastParticipantNames = session.participants.map(p => p.name).sort().join(',');
        } catch (error) {
          console.error('Error handling storage change:', error);
        }
      }
    };

    // Listen for custom session update events (same-tab communication)
    const handleSessionUpdate = (e) => {
      if (e.detail.sessionCode === sessionCode) {
        console.log('🔄 Host dashboard: Custom event - participants updated:', e.detail.sessionData.participants.length);
        setParticipants(e.detail.sessionData.participants);
        // Update tracking variables
        lastParticipantCount = e.detail.sessionData.participants.length;
        lastParticipantNames = e.detail.sessionData.participants.map(p => p.name).sort().join(',');
      }
    };

    // Initial load
    pollParticipants();
    
    // Listen for storage events and custom events
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('session-updated', handleSessionUpdate);
    
    // Reduced polling frequency - rely more on events, less on polling
        const interval = setInterval(pollParticipants, 5000); // Reduced polling frequency to prevent spam
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('session-updated', handleSessionUpdate);
      clearInterval(interval);
    };
  }, [sessionCode]);

  const handleDialogueSelect = (dialogue) => {
    console.log('Selected dialogue:', dialogue);
    // Navigate to live session for the selected dialogue
    setCurrentView('live-session');
    setSelectedDialogue(dialogue);
  };

  // Testing utility functions
  const cleanupDuplicateParticipants = () => {
    if (!sessionCode) {
      console.log('❌ No session code available for cleanup');
      return;
    }
    
    try {
      const sessionKey = `session_${sessionCode}`;
      const sessionData = localStorage.getItem(sessionKey);
      
      if (!sessionData) {
        console.log('❌ No session data found for cleanup');
        return;
      }
      
      const session = JSON.parse(sessionData);
      console.log('🔍 Before cleanup - participants:', session.participants.length, session.participants.map(p => `${p.name}(${p.isHost ? 'host' : 'participant'})`));
      
      const seenNames = new Set();
      const uniqueParticipants = [];
      
      // Keep only participants with truly identical name AND joinedAt time (within 1 second)
      // This prevents removing legitimate participants with same names for testing
      const seenParticipants = new Map();
      
      session.participants.forEach(participant => {
        const key = `${participant.name.toLowerCase()}_${participant.isHost ? 'host' : 'participant'}`;
        const existing = seenParticipants.get(key);
        
        if (!existing) {
          seenParticipants.set(key, participant);
          uniqueParticipants.push(participant);
          console.log('✅ Keeping participant:', participant.name, participant.isHost ? '(host)' : '(participant)');
        } else {
          // For testing: Remove duplicates with same name and role, regardless of join time
          console.log('🗑️ Removing duplicate:', participant.name, participant.isHost ? '(host)' : '(participant)', '(keeping first occurrence)');
        }
      });
      
      const updatedSession = {
        ...session,
        participants: uniqueParticipants
      };
      
      // Update localStorage
      localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
      
      // Trigger storage event for cross-tab communication
      window.dispatchEvent(new StorageEvent('storage', {
        key: sessionKey,
        newValue: JSON.stringify(updatedSession),
        storageArea: localStorage
      }));
      
      console.log('🧹 Cleaned up participants:', {
        before: session.participants.length,
        after: uniqueParticipants.length,
        removed: session.participants.length - uniqueParticipants.length
      });
      
      console.log('🔍 After cleanup - participants:', uniqueParticipants.length, uniqueParticipants.map(p => `${p.name}(${p.isHost ? 'host' : 'participant'})`));
      
      // Update local state
      setParticipants(uniqueParticipants);
      
    } catch (error) {
      console.error('Error cleaning up participants:', error);
    }
  };

  const resetToHostOnly = () => {
    if (!sessionCode) return;
    
    try {
      const sessionKey = `session_${sessionCode}`;
      const sessionData = localStorage.getItem(sessionKey);
      
      if (!sessionData) return;
      
      const session = JSON.parse(sessionData);
      
      // Keep only the host participant
      const hostOnlyParticipants = session.participants.filter(p => p.isHost);
      
      const updatedSession = {
        ...session,
        participants: hostOnlyParticipants,
        // Clear room assignments if they exist
        roomAssignments: null,
        status: 'waiting'
      };
      
      // Update localStorage
      localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
      
      // Trigger storage event for cross-tab communication
      window.dispatchEvent(new StorageEvent('storage', {
        key: sessionKey,
        newValue: JSON.stringify(updatedSession),
        storageArea: localStorage
      }));
      
      console.log('🔄 Reset session to host only:', {
        before: session.participants.length,
        after: hostOnlyParticipants.length
      });
      
      // Update local state
      setParticipants(hostOnlyParticipants);
      
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  };

  const handleReactError = (errorInfo) => {
    console.log('React error caught:', errorInfo);
  };

  const handleQuickDialogueCreate = (dialogueConfig) => {
    console.log('🎯 Quick dialogue created:', dialogueConfig);
    
    // Convert Quick Setup configuration to SessionOrchestrator stages format
    const config = dialogueConfig.configuration;
    const stages = {
      connect: {
        enabled: true,
        duration: config.phases.connect.duration,
        roomType: config.phases.connect.roomType,
        substages: [
          { name: 'Catalyst', duration: Math.floor(config.phases.connect.duration * 0.2), type: 'catalyst', viewMode: 'community' },
          { name: 'Dialogue', duration: Math.floor(config.phases.connect.duration * 0.5), type: 'dialogue', roomType: config.phases.connect.roomType, viewMode: config.phases.connect.roomType },
          { name: 'Summary', duration: Math.floor(config.phases.connect.duration * 0.15), type: 'summary', roomType: config.phases.connect.roomType, viewMode: config.phases.connect.roomType },
          { name: 'WE', duration: Math.floor(config.phases.connect.duration * 0.15), type: 'community', viewMode: 'community' }
        ]
      },
      explore: {
        enabled: true,
        duration: config.phases.explore.duration,
        roomType: config.phases.explore.roomType,
        substages: [
          { name: 'Catalyst', duration: Math.floor(config.phases.explore.duration * 0.18), type: 'catalyst', viewMode: 'community' },
          { name: 'Dialogue', duration: Math.floor(config.phases.explore.duration * 0.55), type: 'dialogue', roomType: config.phases.explore.roomType, viewMode: config.phases.explore.roomType },
          { name: 'Summary', duration: Math.floor(config.phases.explore.duration * 0.12), type: 'summary', roomType: config.phases.explore.roomType, viewMode: config.phases.explore.roomType },
          { name: 'WE', duration: Math.floor(config.phases.explore.duration * 0.15), type: 'community', viewMode: 'community' }
        ]
      },
      discover: {
        enabled: true,
        duration: config.phases.discover.duration,
        roomType: config.phases.discover.roomType,
        substages: [
          { name: 'Catalyst', duration: Math.floor(config.phases.discover.duration * 0.2), type: 'catalyst', viewMode: 'community' },
          { name: 'Dialogue', duration: Math.floor(config.phases.discover.duration * 0.5), type: 'dialogue', roomType: config.phases.discover.roomType, viewMode: config.phases.discover.roomType },
          { name: 'Summary', duration: Math.floor(config.phases.discover.duration * 0.15), type: 'summary', roomType: config.phases.discover.roomType, viewMode: config.phases.discover.roomType },
          { name: 'WE', duration: Math.floor(config.phases.discover.duration * 0.15), type: 'community', viewMode: 'community' }
        ]
      },
      closing: {
        enabled: true,
        duration: 15,
        substages: [
          { name: 'Closing', duration: 15, type: 'community', viewMode: 'community' }
        ]
      }
    };

    // Create a dialogue object compatible with the existing system
    const dialogue = {
      id: `quick_${Date.now()}`,
      title: dialogueConfig.title,
      description: `Quick setup: ${dialogueConfig.timeSlot} session for ${dialogueConfig.participantCount} participants`,
      facilitator: 'AI Facilitator',
      host: 'Current User',
      gatheringSize: dialogueConfig.participantCount,
      duration: config.phases.connect.duration + 
                config.phases.explore.duration + 
                config.phases.discover.duration + 15, // +15 for closing
      createdAt: new Date().toISOString(),
      quickSetupConfig: dialogueConfig,
      stages: stages, // Add proper stages format
      type: 'quick-setup'
    };

    console.log('🔧 Converted dialogue config:', dialogue);

    // Set as selected dialogue and go to live session
    setSelectedDialogue(dialogue);
    setCurrentView('live-session');
    setShowQuickSetup(false);
  };

  // NEW: Handle room creation from Session Flow Manager
  const handleSessionFlowRoomCreation = (roomType, participantCount) => {
    console.log(`🚀 Session Flow Manager: Creating ${roomType} rooms for ${participantCount} participants`);
    
    // Create a minimal dialogue configuration for room creation
    const sessionFlowDialogue = {
      id: `session_flow_${Date.now()}`,
      title: `Session Flow: ${roomType.charAt(0).toUpperCase() + roomType.slice(1)} Rooms`,
      description: `Created from Session Flow Manager for ${participantCount} participants`,
      facilitator: 'Session Flow Manager',
      host: 'Current User',
      gatheringSize: participantCount,
      duration: 60, // Default 60 minutes
      roomType: roomType,
      stages: {
        active: {
          enabled: true,
          duration: 60,
          roomType: roomType,
          substages: [
            { 
              name: 'Dialogue', 
              duration: 60, 
              type: 'dialogue', 
              roomType: roomType, 
              viewMode: roomType,
              description: `${roomType.charAt(0).toUpperCase() + roomType.slice(1)} dialogue session`
            }
          ]
        }
      },
      createdAt: new Date().toISOString(),
      type: 'session-flow-generated',
      autoCreateRooms: true // Flag to trigger automatic room creation
    };

    console.log('🔧 Session Flow dialogue config:', sessionFlowDialogue);
    
    // Navigate to live session with auto-created rooms
    setSelectedDialogue(sessionFlowDialogue);
    setCurrentView('live-session');
  };

  const handleDeveloperModeAccess = () => {
    if (developerAccess) {
      // Already have access, switch to developer mode
      setDashboardMode('developer');
      setCurrentView('overview');
    } else {
      // Need password, show prompt
      setShowPasswordPrompt(true);
    }
  };

  // Session Management Functions
  const generateSessionCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateSessionCode = async () => {
    // Prompt host for their name
    const hostName = prompt('Enter your name as the host:');
    if (!hostName || !hostName.trim()) {
      alert('Host name is required to create a session.');
      return;
    }

    const newCode = generateSessionCode();
    setSessionCode(newCode);
    
    // Create session data
    const sessionData = {
      sessionId: newCode,
      hostName: hostName.trim(),
      participants: [{
        id: 'host',
        name: hostName.trim(),
        isHost: true,
        joinedAt: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      status: 'waiting',
      maxParticipants: 6,
      duration: 90,
      roomConfiguration: {
        roomType: ROOM_TYPES.DYAD, // Default to dyads for MVP
        allowRoomSwitching: true
      }
    };

    try {
      // Pre-assign rooms for the session (will be used when participants join)
      console.log('🏠 Pre-assigning rooms for session...');
      const roomStats = roomManager.getSystemStats();
      console.log('🏠 Room system stats:', roomStats);
      
      // Store session data
      localStorage.setItem(`session_${newCode}`, JSON.stringify(sessionData));
      setParticipants(sessionData.participants);
      
      console.log(`🎯 Session created with code: ${newCode} by host: ${hostName}`);
      console.log('🏠 Room assignments will be created when participants join');
      
    } catch (error) {
      console.error('❌ Failed to create session:', error);
      alert(`Failed to create session: ${error.message}`);
    }
  };

  const handleJoinWithCode = (code, participantName) => {
    // Load session from storage
    const sessionData = localStorage.getItem(`session_${code.toUpperCase()}`);
    if (!sessionData) {
      alert('Session not found. Please check the code.');
      return;
    }

    const session = JSON.parse(sessionData);
    
    // Add participant
    const newParticipant = {
      id: `participant_${Date.now()}`,
      name: participantName,
      isHost: false,
      joinedAt: new Date().toISOString()
    };

    session.participants.push(newParticipant);
    localStorage.setItem(`session_${code.toUpperCase()}`, JSON.stringify(session));
    
    setSessionCode(code.toUpperCase());
    setParticipants(session.participants);
    setIsHost(false);
    
    console.log(`👥 Joined session ${code} as ${participantName}`);
  };

  const handlePasswordSubmit = (password) => {
    // In production, this would be properly secured
    const correctPassword = 'dev2024'; // Simple password for demo
    if (password === correctPassword) {
      setDeveloperAccess(true);
      setDashboardMode('developer');
      setCurrentView('overview');
      setShowPasswordPrompt(false);
    } else {
      alert('Incorrect password. Access denied.');
      setShowPasswordPrompt(false);
    }
  };

  return (
    <div className="dashboard-page">
      {/* Debug monitoring completely removed - clean dashboard */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>Generative Dialogue Dashboard</h1>
            <div className="mode-indicator">
              <span className={`mode-badge mode-${dashboardMode}`}>
                {dashboardMode === 'configuration' && '🔧 CONFIGURATION'}
                {dashboardMode === 'live' && '📡 LIVE SESSION'}
                {dashboardMode === 'analysis' && '📊 ANALYSIS'}
                {dashboardMode === 'developer' && '🔐 DEVELOPER MODE'}
              </span>
            </div>
            <p className="dashboard-subtitle">
              {dashboardMode === 'configuration' && 'Design and configure dialogue experiences'}
              {dashboardMode === 'live' && 'Real-time monitoring and control'}
              {dashboardMode === 'analysis' && 'Insights and retrospective analysis'}
              {dashboardMode === 'developer' && 'AI testing, evaluation, and advanced analytics'}
            </p>
          </div>
          <div className="header-nav">
            <div className="mode-switcher">
              <button 
                className={`mode-btn ${dashboardMode === 'configuration' ? 'active' : ''}`}
                onClick={() => {
                  setDashboardMode('configuration');
                  setCurrentView('overview');
                }}
                title="Configuration Mode - Design dialogues"
              >
                🔧 Config
              </button>
              <button 
                className={`mode-btn ${dashboardMode === 'live' ? 'active' : ''}`}
                onClick={() => {
                  setDashboardMode('live');
                  setCurrentView('overview');
                }}
                title="Live Mode - Monitor active sessions"
              >
                📡 Live
              </button>
              <button 
                className={`mode-btn ${dashboardMode === 'analysis' ? 'active' : ''}`}
                onClick={() => {
                  setDashboardMode('analysis');
                  setCurrentView('overview');
                }}
                title="Analysis Mode - Research and insights"
              >
                📊 Analysis
              </button>
              <button 
                className={`mode-btn developer-btn ${dashboardMode === 'developer' ? 'active' : ''}`}
                onClick={handleDeveloperModeAccess}
                title="Developer Mode - AI testing and evaluation (Password required)"
              >
                🔐 Developer
              </button>
            </div>
            <div className="view-switcher">
              <button 
                className={`nav-btn ${currentView === 'overview' ? 'active' : ''}`}
                onClick={() => setCurrentView('overview')}
                title="System overview - Health, statistics, and monitoring"
              >
                📊 Overview
              </button>
              <button 
                className={`nav-btn ${currentView === 'dialogues' ? 'active' : ''}`}
                onClick={() => setCurrentView('dialogues')}
                title="Manage dialogues - Create, edit, and launch sessions"
              >
                🎭 Dialogues
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div className="password-modal-overlay">
          <div className="password-modal">
            <h3>🔐 Developer Mode Access</h3>
            <p>Enter the developer password to access AI testing and evaluation tools:</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const password = e.target.password.value;
              handlePasswordSubmit(password);
            }}>
              <input
                type="password"
                name="password"
                placeholder="Enter password"
                autoFocus
                className="password-input"
              />
              <div className="password-actions">
                <button type="submit" className="password-submit">Access</button>
                <button type="button" onClick={() => setShowPasswordPrompt(false)} className="password-cancel">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Content based on current view and mode */}
      {currentView === 'dialogues' ? (
        <ErrorBoundary onError={handleReactError}>
          <DialogueManager onDialogueSelect={handleDialogueSelect} />
        </ErrorBoundary>
      ) : currentView === 'session-flow' ? (
        <ErrorBoundary onError={handleReactError}>
          <div className="session-flow-container">
            <div className="session-flow-header">
              <button 
                className="back-btn"
                onClick={() => setCurrentView('overview')}
                title="Back to Dashboard"
              >
                ← Back to Dashboard
              </button>
              <h2>📋 Session Flow Manager</h2>
              <p>Configure your dialogue phases with Quick Setup integration</p>
            </div>
            <SessionFlowManager
              isHost={true}
              participantCount={20}
              onPhaseChange={(phase, subphase, config) => {
                console.log(`🎯 Phase configured: ${phase} → ${subphase}`, config);
              }}
              onCreateBreakoutRooms={(roomType, participantCount) => {
                console.log(`🏠 Creating ${roomType} rooms for ${participantCount} participants`);
                // Create the dialogue configuration and navigate to live session
                handleSessionFlowRoomCreation(roomType, participantCount);
              }}
              onTimerComplete={() => {
                console.log('⏰ Session timer completed');
              }}
              autoAdvance={false}
              isVisible={true}
            />
          </div>
        </ErrorBoundary>
      ) : currentView === 'live-session' && selectedDialogue ? (
        <ErrorBoundary onError={handleReactError}>
          <SessionOrchestrator
            dialogueConfig={selectedDialogue}
            participants={Array.from({ length: selectedDialogue.gatheringSize || 6 }, (_, i) => ({
              id: `participant_${i}`,
              name: `Participant ${i + 1}`,
              status: 'ready'
            }))}
            isHost={true}
            onSessionEnd={() => {
              setCurrentView('dialogues');
              setSelectedDialogue(null);
            }}
          />
        </ErrorBoundary>
      ) : (
        <>
          {/* Mode-specific content for Overview */}
          {dashboardMode === 'configuration' && renderConfigurationMode()}
          {dashboardMode === 'live' && renderLiveMode()}
          {dashboardMode === 'analysis' && renderAnalysisMode()}
          {dashboardMode === 'developer' && renderDeveloperMode()}
        </>
      )}

      {/* Quick Dialogue Setup Modal */}
      {showQuickSetup && (
        <QuickDialogueSetup
          onCreateDialogue={handleQuickDialogueCreate}
          onClose={() => setShowQuickSetup(false)}
          onAdvancedSetup={() => {
            setShowQuickSetup(false);
            setCurrentView('dialogues');
          }}
        />
      )}
    </div>
  );

  // Configuration Mode - Current functionality
  function renderConfigurationMode() {
    return (
      <>
        {/* Quick Actions */}
        <div className="dashboard-section dashboard-first-section">
          <h2>🚀 Quick Actions</h2>
          <div className="quick-actions-grid">
            <button 
              className="quick-action-btn primary"
              onClick={() => setShowQuickSetup(true)}
              title="Create a dialogue session in under 30 seconds"
            >
              <div className="quick-action-icon">🎯</div>
              <div className="quick-action-content">
                <h3>Quick Dialogue Setup</h3>
                <p>Create rooms in 30 seconds with smart recommendations</p>
              </div>
            </button>
            <button 
              className="quick-action-btn secondary"
              onClick={() => setCurrentView('session-flow')}
              title="Visual session timeline with Quick Setup integration"
            >
              <div className="quick-action-icon">📋</div>
              <div className="quick-action-content">
                <h3>Session Flow Manager</h3>
                <p>Visual timeline with ⚙️ gear symbols for Quick Setup</p>
              </div>
            </button>
            <button 
              className="quick-action-btn session-code"
              onClick={handleCreateSessionCode}
              title="Generate a session code for 6 remote participants"
            >
              <div className="quick-action-icon">🎯</div>
              <div className="quick-action-content">
                <h3>Create Session Code</h3>
                <p>Generate code for 6 remote peers to join</p>
              </div>
            </button>
            <button 
              className="quick-action-btn tertiary"
              onClick={() => setCurrentView('dialogues')}
              title="Full dialogue configuration with all options"
            >
              <div className="quick-action-icon">⚙️</div>
              <div className="quick-action-content">
                <h3>Advanced Setup</h3>
                <p>Full configuration with custom phases & catalysts</p>
              </div>
            </button>
          </div>
        </div>

        {/* Session Management Panel */}
        {sessionCode && (
          <div className="dashboard-section session-management">
            <h2>🎯 Active Session: {sessionCode}</h2>
            <div className="session-info-grid">
              <div className="session-card">
                <h3>Session Code</h3>
                <div className="session-code-display">
                  <span className="code">{sessionCode}</span>
                  <button 
                    className="copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(sessionCode);
                      alert('Session code copied!');
                    }}
                  >
                    📋 Copy
                  </button>
                </div>
                <p>Share this code with up to 6 participants</p>
              </div>
              
              <div className="session-card">
                <h3>Participants ({participants.length}/6)</h3>
                <div className="participants-list">
                  {participants.map((participant) => (
                    <div key={participant.id} className="participant-item">
                      <span className="participant-name">{participant.name}</span>
                      {participant.isHost && <span className="host-badge">Host</span>}
                    </div>
                  ))}
                </div>
                
                {/* Testing Tools */}
                {participants.length > 1 && (
                  <div className="testing-tools" style={{ marginTop: '12px', padding: '8px', background: '#f0f8ff', borderRadius: '6px', border: '1px solid #e0e8f0' }}>
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>🧪 Testing Tools:</div>
                    <button 
                      className="cleanup-btn"
                      style={{ 
                        fontSize: '11px', 
                        padding: '4px 8px', 
                        background: '#ff6b6b', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer',
                        marginRight: '6px'
                      }}
                      onClick={() => {
                        if (window.confirm('Remove duplicate participant names? This will keep only the first occurrence of each name.')) {
                          cleanupDuplicateParticipants();
                        }
                      }}
                      title="Remove participants with duplicate names, keeping only the first occurrence"
                    >
                      🧹 Remove Duplicates
                    </button>
                    <button 
                      className="reset-btn"
                      style={{ 
                        fontSize: '11px', 
                        padding: '4px 8px', 
                        background: '#ffa500', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (window.confirm('Reset session to host only? This will remove all participants except the host.')) {
                          resetToHostOnly();
                        }
                      }}
                      title="Remove all participants except the host"
                    >
                      🔄 Reset to Host Only
                    </button>
                  </div>
                )}
              </div>
              
              <div className="session-card">
                <h3>Session URL</h3>
                <div className="session-url">
                  <input 
                    type="text" 
                    value={`${window.location.origin}?session=${sessionCode}`}
                    readOnly 
                    onClick={(e) => e.target.select()}
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?session=${sessionCode}`);
                      alert('Session URL copied!');
                    }}
                  >
                    🔗 Copy URL
                  </button>
                </div>
              </div>
            </div>
            
            {participants.length >= 2 && (
              <div className="session-actions">
                <button 
                  className="start-session-btn"
                  onClick={async () => {
                    try {
                      console.log('🚀 Starting dialogue session:', sessionCode);
                      
                      // Check if we have room assignments already
                      const sessionKey = `session_${sessionCode}`;
                      const currentSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
                      
                      if (!currentSession.roomAssignments) {
                        throw new Error('No room assignments found. Please assign rooms first.');
                      }
                      
                      console.log('✅ Using existing room assignments for dialogue session');
                      
                      // Create a dialogue configuration using existing room assignments
                      const sessionDialogue = {
                        id: `session_${sessionCode}`,
                        title: `90-Minute Dialogue Session (${sessionCode})`,
                        description: `Session with ${participants.length} participants`,
                        facilitator: 'AI Facilitator',
                        host: participants.find(p => p.isHost)?.name || 'Host',
                        gatheringSize: participants.length,
                        duration: 90,
                        roomType: 'dyad',
                        stages: {
                          connect: { enabled: true, duration: 25, roomType: 'dyad' },
                          explore: { enabled: true, duration: 30, roomType: 'dyad' },
                          discover: { enabled: true, duration: 30, roomType: 'triad' },
                          closing: { enabled: true, duration: 5, roomType: 'community' }
                        },
                        participants: participants,
                        sessionCode: sessionCode,
                        autoCreateRooms: true,
                        roomAssignments: currentSession.roomAssignments,
                        // Use the first room as the main room for backwards compatibility
                        dailyRoom: Object.values(currentSession.roomAssignments.rooms)[0] || {
                          url: `https://generative-dialogue.daily.co/${sessionCode}`,
                          name: sessionCode,
                          id: sessionCode
                        }
                      };
                      
                      // Update session status to active
                      const updatedSession = {
                        ...currentSession,
                        status: 'dialogue-active',
                        startedAt: new Date().toISOString(),
                        sessionDialogue: sessionDialogue
                      };
                      localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
                      
                      // Notify participants that dialogue has started
                      console.log('🚀 Dialogue session started successfully:', {
                        sessionCode: sessionCode,
                        participantCount: participants.length,
                        roomCount: Object.keys(currentSession.roomAssignments.rooms).length
                      });
                      
                      // Create a temporary notification key that will trigger storage events
                      const notificationKey = `session_notification_${sessionCode}_${Date.now()}`;
                      const notificationData = {
                        type: 'dialogue-started',
                        sessionCode: sessionCode,
                        roomAssignments: currentSession.roomAssignments,
                        timestamp: new Date().toISOString()
                      };
                      
                      localStorage.setItem(notificationKey, JSON.stringify(notificationData));
                      
                      // Clean up notification after a brief moment
                      setTimeout(() => {
                        localStorage.removeItem(notificationKey);
                      }, 1000);
                      
                      console.log('✅ Cross-tab notification sent via localStorage');
                      
                      setSelectedDialogue(sessionDialogue);
                      setCurrentView('live-session');
                      
                    } catch (error) {
                      console.error('❌ Failed to start session:', error);
                      alert('Failed to start session. Please try again.');
                    }
                  }}
                >
                  🚀 Start 90-Minute Dialogue
                </button>
              </div>
            )}
            
            {/* Room Assignment Manager - Show when we have participants */}
            {participants.length >= 1 && (
              <RoomAssignmentManager
                sessionData={{
                  sessionId: sessionCode,
                  participants: participants,
                  roomConfiguration: {
                    roomType: ROOM_TYPES.DYAD,
                    allowRoomSwitching: true
                  }
                }}
                onRoomAssignmentsReady={(assignments) => {
                  console.log('🏠 Room assignments ready:', assignments);
                  // Update session data with room assignments
                  const sessionKey = `session_${sessionCode}`;
                  const currentSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
                  const updatedSession = {
                    ...currentSession,
                    roomAssignments: assignments,
                    status: 'rooms-assigned'
                  };
                  localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
                  
                  // Notify participants of room assignments
                  window.dispatchEvent(new CustomEvent('session-updated', {
                    detail: { sessionCode, sessionData: updatedSession }
                  }));
                }}
                onError={(error) => {
                  console.error('❌ Room assignment error:', error);
                  alert(`Room assignment failed: ${error}`);
                }}
              />
            )}

            {/* Host Join Room Button - Show when rooms are assigned */}
            {sessionCode && (() => {
              const sessionKey = `session_${sessionCode}`;
              const currentSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
              const roomAssignments = currentSession.roomAssignments;
              
              if (!roomAssignments) return null;
              
              // Find host's room assignment
              const hostAssignment = roomAssignments.participants?.host;
              if (!hostAssignment) return null;
              
              const hostRoom = Object.values(roomAssignments.rooms || {}).find(room => 
                room.id === hostAssignment.roomId || room.name === hostAssignment.roomName
              );
              
              if (!hostRoom) return null;
              
              return (
                <div className="dashboard-section host-room-section">
                  <h3>🎯 Your Room Assignment</h3>
                  <div className="host-room-info">
                    <p><strong>Room:</strong> {hostRoom.name}</p>
                    <p><strong>Type:</strong> {hostRoom.type}</p>
                    <p><strong>Participants:</strong> {hostRoom.participants?.length || 0}</p>
                  </div>
                  <button 
                    className="join-room-button primary-button"
                    onClick={() => {
                      // Navigate to participant session with host data
                      const hostParticipant = participants.find(p => p.isHost) || { 
                        name: 'Host', 
                        isHost: true 
                      };
                      
                      // Store host as current participant
                      localStorage.setItem('gd_participant_name', hostParticipant.name);
                      
                      // Navigate to video session
                      const sessionData = {
                        ...currentSession,
                        currentParticipant: hostParticipant
                      };
                      
                      // Update session with current participant
                      localStorage.setItem(sessionKey, JSON.stringify(sessionData));
                      
                      // Navigate to participant session
                      window.location.href = `/?page=participant-session&session=${sessionCode}`;
                    }}
                  >
                    🎥 Join My Room
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* System Health */}
        <div className="dashboard-section">
          <h2>🔧 System Health</h2>
        <div className="health-grid">
          <div className="health-item">
            <span className="health-label">Backend:</span>
            <span className={`health-status ${systemHealth.backend === 'online' ? 'good' : 'poor'}`}>
              {systemHealth.backend}
            </span>
          </div>
          <div className="health-item">
            <span className="health-label">Database:</span>
            <span className={`health-status ${systemHealth.database === 'connected' ? 'good' : 'poor'}`}>
              {systemHealth.database}
            </span>
          </div>
          <div className="health-item">
            <span className="health-label">AI Services:</span>
            <span className="health-status good">{systemHealth.services}</span>
          </div>
        </div>
      </div>

      {/* Live Statistics */}
      <div className="dashboard-section">
        <h2>📊 Live Session Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Participants</h3>
            <div className="stat-number">{mockData.totalParticipants}</div>
            <div className="stat-label">Total Connected</div>
          </div>
          <div className="stat-card">
            <h3>Device Types</h3>
            <div className="device-breakdown">
              <div>📱 Mobile: {mockData.deviceBreakdown.mobile}</div>
              <div>📱 Tablet: {mockData.deviceBreakdown.tablet}</div>
              <div>💻 Desktop: {mockData.deviceBreakdown.desktop}</div>
            </div>
          </div>
          <div className="stat-card">
            <h3>Connection Quality</h3>
            <div className="quality-breakdown">
              <div className="quality-good">✅ Good: {mockData.connectionQuality.good}</div>
              <div className="quality-fair">⚠️ Fair: {mockData.connectionQuality.fair}</div>
              <div className="quality-poor">❌ Poor: {mockData.connectionQuality.poor}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Growth Tracking Overview */}
      <div className="dashboard-section">
        <h2>🌱 Growth Tracking System</h2>
        <div className="growth-tracking-overview">
          <div className="growth-features">
            <div className="growth-feature">
              <div className="growth-icon">📈</div>
              <div className="growth-content">
                <h3 className="growth-title">Episodic Growth</h3>
                <p className="growth-description">Track immediate insights and "aha moments" during conversations</p>
              </div>
            </div>
            <div className="growth-feature">
              <div className="growth-icon">🔄</div>
              <div className="growth-content">
                <h3 className="growth-title">Developmental Growth</h3>
                <p className="growth-description">Monitor skill building and perspective shifts over time</p>
              </div>
            </div>
            <div className="growth-feature">
              <div className="growth-icon">🦋</div>
              <div className="growth-content">
                <h3 className="growth-title">Transformational Growth</h3>
                <p className="growth-description">Identify deep worldview changes and paradigm shifts</p>
              </div>
            </div>
          </div>
          <div className="growth-status">
            <p><strong>Status:</strong> AI analysis system active, tracking contributions in real-time</p>
            <p><strong>Features:</strong> Sentiment analysis, sophistication scoring, empathy detection, creativity metrics</p>
          </div>
        </div>
      </div>

      {/* Dashboard Features */}
      <div className="dashboard-section">
        <h2>🎛️ Dashboard Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <h3>🎯 Host Controls</h3>
            <p>Session management, participant orchestration, stage transitions</p>
          </div>
          <div className="feature-card">
            <h3>👁️ Monitor View</h3>
            <p>Behind-the-scenes support, technical monitoring, quality assurance</p>
          </div>
          <div className="feature-card">
            <h3>📋 Observer Dashboard</h3>
            <p>High-level summaries for funders, clients, and stakeholders</p>
          </div>
          <div className="feature-card">
            <h3>🔧 Developer Tools</h3>
            <p>System diagnostics, performance metrics, debugging tools</p>
          </div>
        </div>
      </div>

      {/* Journey Dashboard Preview */}
      <div className="dashboard-section">
        <h2>🚀 Journey Dashboard</h2>
        <p>The Journey Dashboard is now available as a new tab in the main dialogue interface!</p>
        <div className="journey-preview">
          <p><strong>✅ Active Features:</strong></p>
          <ul>
            <li>Individual participant growth tracking</li>
            <li>AI-powered contribution analysis</li>
            <li>Real-time insight generation</li>
            <li>Growth moment identification</li>
          </ul>
          <p><strong>📍 Access:</strong> Look for the "Journey" tab between "Summary" and "WE" in the main interface</p>
        </div>
      </div>
      </>
    );
  }

  // Live Mode - Real-time session monitoring
  function renderLiveMode() {
    return (
      <>
        {/* Active Session Status */}
        <div className="dashboard-section dashboard-first-section live-session">
          <h2>📡 Active Session: "Community Climate Dialogue"</h2>
          <div className="session-status">
            <div className="status-item">
              <span className="status-label">Current Stage:</span>
              <span className="status-value stage-connect">🤝 Connect - Dialogue</span>
            </div>
            <div className="status-item">
              <span className="status-label">Time Remaining:</span>
              <span className="status-value">12:34</span>
            </div>
            <div className="status-item">
              <span className="status-label">Active Participants:</span>
              <span className="status-value">24/30</span>
            </div>
            <div className="status-item">
              <span className="status-label">Breakout Rooms:</span>
              <span className="status-value">12 Dyads</span>
            </div>
          </div>
        </div>

        {/* Live Participant Grid */}
        <div className="dashboard-section">
          <h2>👥 Live Participants</h2>
          <div className="participants-grid">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="participant-card live">
                <div className="participant-avatar">👤</div>
                <div className="participant-info">
                  <div className="participant-name">Participant {i}</div>
                  <div className="participant-status">
                    <span className="connection-quality good">●</span>
                    <span className="device-type">💻</span>
                    <span className="speaking-indicator">🎤</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Transcript Feeds */}
        <div className="dashboard-section">
          <h2>📝 Live Transcript Feeds</h2>
          <div className="transcript-grid">
            <div className="transcript-feed">
              <h4>Dyad Room 1</h4>
              <div className="transcript-content">
                <p><strong>Sarah:</strong> "I think what's most alive for me right now is this sense of urgency about climate action, but also this deep grief about what we've already lost..."</p>
                <p><strong>Michael:</strong> "Yes, I feel that too. There's something about holding both the hope and the grief simultaneously that feels really important..."</p>
              </div>
            </div>
            <div className="transcript-feed">
              <h4>Dyad Room 2</h4>
              <div className="transcript-content">
                <p><strong>Elena:</strong> "What brought me here is my children. I keep thinking about what kind of world we're leaving them..."</p>
                <p><strong>David:</strong> "That resonates deeply. I'm curious about how we can channel that parental energy into collective action..."</p>
              </div>
            </div>
          </div>
        </div>

        {/* Host Controls */}
        <div className="dashboard-section">
          <h2>🎛️ Host Controls</h2>
          <div className="host-controls">
            <button className="control-btn primary">Advance to Summary</button>
            <button className="control-btn secondary">Extend Time (+5 min)</button>
            <button className="control-btn secondary">Send Message to All</button>
            <button className="control-btn warning">Emergency Stop</button>
          </div>
        </div>
      </>
    );
  }

  // Feedback handling for AI suggestions
  const handleFeedback = (action, suggestionId) => {
    // In production, this would send feedback to backend for AI learning
    console.log(`Feedback: ${action} for suggestion ${suggestionId}`);
    
    // Show user feedback
    const messages = {
      approve: '✅ Suggestion approved! Added to library and queued for A/B testing.',
      edit: '✏️ Opening editor to modify this suggestion.',
      reject: '👎 Suggestion rejected. This helps improve future recommendations.'
    };
    
    // Simple feedback notification (in production, use proper toast/notification system)
    alert(messages[action]);
    
    // Here you would typically:
    // - Send feedback to AI learning system
    // - Update suggestion status
    // - Track feedback for improving future suggestions
    // - If approved, add to prompt library
    // - If editing, open prompt editor modal
  };

  // Analysis Mode - Retrospective insights
  function renderAnalysisMode() {
    return (
      <>
        {/* Session Archive */}
        <div className="dashboard-section dashboard-first-section">
          <h2>📊 Session Archive</h2>
          <div className="sessions-list">
            {[
              { id: 1, title: "Community Climate Dialogue", date: "2024-01-15", participants: 28, insights: 47 },
              { id: 2, title: "Future of Work Conversation", date: "2024-01-12", participants: 22, insights: 34 },
              { id: 3, title: "Healing Community Trauma", date: "2024-01-08", participants: 16, insights: 28 }
            ].map(session => (
              <div key={session.id} className="session-card">
                <div className="session-info">
                  <h4>{session.title}</h4>
                  <p>{session.date} • {session.participants} participants • {session.insights} insights</p>
                </div>
                <div className="session-actions">
                  <button className="action-btn">View Insights</button>
                  <button className="action-btn">Export Data</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pattern Analysis */}
        <div className="dashboard-section">
          <h2>🔍 Pattern Analysis</h2>
          <div className="analysis-grid">
            <div className="analysis-card">
              <h4>Recurring Themes</h4>
              <div className="theme-list">
                <div className="theme-item">
                  <span className="theme-name">Intergenerational Responsibility</span>
                  <span className="theme-frequency">89% of sessions</span>
                </div>
                <div className="theme-item">
                  <span className="theme-name">Systems Thinking</span>
                  <span className="theme-frequency">76% of sessions</span>
                </div>
                <div className="theme-item">
                  <span className="theme-name">Collective Action</span>
                  <span className="theme-frequency">82% of sessions</span>
                </div>
              </div>
            </div>
            <div className="analysis-card">
              <h4>Participation Patterns</h4>
              <div className="stats-list">
                <div className="stat-item">
                  <span className="stat-label">Avg Speaking Time:</span>
                  <span className="stat-value">4.2 min per person</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Question Frequency:</span>
                  <span className="stat-value">2.8 questions per dialogue</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Building on Others:</span>
                  <span className="stat-value">67% of contributions</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Journey Tracking */}
        <div className="dashboard-section">
          <h2>🌱 Individual Journey Tracking</h2>
          <div className="journey-grid">
            <div className="journey-card">
              <div className="participant-header">
                <h4>Sarah Chen</h4>
                <span className="sessions-count">12 sessions</span>
              </div>
              <div className="growth-indicators">
                <div className="growth-item">
                  <span className="growth-type">Episodic:</span>
                  <div className="growth-bar"><div className="growth-fill" style={{width: '85%'}}></div></div>
                </div>
                <div className="growth-item">
                  <span className="growth-type">Developmental:</span>
                  <div className="growth-bar"><div className="growth-fill" style={{width: '62%'}}></div></div>
                </div>
                <div className="growth-item">
                  <span className="growth-type">Transformational:</span>
                  <div className="growth-bar"><div className="growth-fill" style={{width: '34%'}}></div></div>
                </div>
              </div>
            </div>
            <div className="journey-card">
              <div className="participant-header">
                <h4>Michael Rodriguez</h4>
                <span className="sessions-count">8 sessions</span>
              </div>
              <div className="growth-indicators">
                <div className="growth-item">
                  <span className="growth-type">Episodic:</span>
                  <div className="growth-bar"><div className="growth-fill" style={{width: '78%'}}></div></div>
                </div>
                <div className="growth-item">
                  <span className="growth-type">Developmental:</span>
                  <div className="growth-bar"><div className="growth-fill" style={{width: '45%'}}></div></div>
                </div>
                <div className="growth-item">
                  <span className="growth-type">Transformational:</span>
                  <div className="growth-bar"><div className="growth-fill" style={{width: '12%'}}></div></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Developer Mode - AI Testing and Evaluation
  function renderDeveloperMode() {
    return (
      <>
        {/* Developer Mode Header */}
        <div className="dashboard-section dashboard-first-section developer-header">
          <h2>🔐 Developer Mode - AI Testing & Evaluation</h2>
          <div className="developer-status">
            <span className="access-granted">✅ Access Granted</span>
            <button 
              className="logout-btn"
              onClick={() => {
                setDeveloperAccess(false);
                setDashboardMode('configuration');
              }}
            >
              🚪 Exit Developer Mode
            </button>
          </div>
        </div>

        {/* AI Processing Meta-Prompts */}
        <div className="dashboard-section">
          <h2>🤖 AI Processing Meta-Prompts</h2>
          <p className="section-description">Configure how AI analyzes transcripts, extracts insights, and generates summaries. Test different prompt engineering approaches.</p>
          
          <div className="meta-prompts-grid">
            <div className="meta-prompt-card">
              <div className="meta-prompt-header">
                <h4>📝 Transcript Analysis</h4>
                <div className="prompt-status">
                  <span className="status-badge active">Active</span>
                  <span className="version-info">v2.1</span>
                </div>
              </div>
              <p className="meta-prompt-description">How AI should identify key themes, patterns, and significant moments in raw transcripts.</p>
              <div className="meta-prompt-preview">
                <p><strong>Current Prompt:</strong> "Analyze this dialogue transcript and identify: 1) Recurring themes and patterns, 2) Moments of high engagement or insight, 3) Emotional dynamics and shifts, 4) Collective wisdom emergence points..."</p>
              </div>
              <div className="meta-prompt-actions">
                <button className="btn-secondary small">Edit Prompt</button>
                <button className="btn-primary small">A/B Test</button>
              </div>
            </div>

            <div className="meta-prompt-card">
              <div className="meta-prompt-header">
                <h4>💡 Insight Extraction</h4>
                <div className="prompt-status">
                  <span className="status-badge testing">Testing</span>
                  <span className="version-info">v1.3 vs v1.4</span>
                </div>
              </div>
              <p className="meta-prompt-description">Instructions for prioritizing and categorizing insights from participant contributions.</p>
              <div className="meta-prompt-preview">
                <p><strong>Version A:</strong> "Extract actionable insights focusing on practical applications..."</p>
                <p><strong>Version B:</strong> "Identify transformational insights that challenge existing paradigms..."</p>
              </div>
              <div className="meta-prompt-actions">
                <button className="btn-secondary small">View Test Results</button>
                <button className="btn-primary small">Deploy Winner</button>
              </div>
            </div>

            <div className="meta-prompt-card">
              <div className="meta-prompt-header">
                <h4>📊 Summary Generation</h4>
                <div className="prompt-status">
                  <span className="status-badge draft">Draft</span>
                  <span className="version-info">v3.0-beta</span>
                </div>
              </div>
              <p className="meta-prompt-description">Framework for structuring dialogue summaries and key takeaways.</p>
              <div className="meta-prompt-preview">
                <p><strong>Draft Prompt:</strong> "Create a structured summary with: Executive Overview, Key Insights, Participant Highlights, Emerging Questions, Next Steps..."</p>
              </div>
              <div className="meta-prompt-actions">
                <button className="btn-secondary small">Edit Draft</button>
                <button className="btn-primary small">Start Testing</button>
              </div>
            </div>

            <div className="meta-prompt-card">
              <div className="meta-prompt-header">
                <h4>🧠 Collective Wisdom Compilation</h4>
                <div className="prompt-status">
                  <span className="status-badge active">Active</span>
                  <span className="version-info">v1.8</span>
                </div>
              </div>
              <p className="meta-prompt-description">How AI should synthesize individual contributions into collective intelligence.</p>
              <div className="meta-prompt-preview">
                <p><strong>Current Prompt:</strong> "Synthesize individual perspectives into collective wisdom by identifying: shared values, complementary viewpoints, emergent possibilities..."</p>
              </div>
              <div className="meta-prompt-actions">
                <button className="btn-secondary small">Performance Metrics</button>
                <button className="btn-primary small">Create Variant</button>
              </div>
            </div>

            <div className="meta-prompt-card">
              <div className="meta-prompt-header">
                <h4>📈 Growth Tracking</h4>
                <div className="prompt-status">
                  <span className="status-badge active">Active</span>
                  <span className="version-info">v2.0</span>
                </div>
              </div>
              <p className="meta-prompt-description">Indicators AI should track for participant development and engagement evolution.</p>
              <div className="meta-prompt-preview">
                <p><strong>Current Prompt:</strong> "Track participant growth indicators: engagement depth, perspective expansion, collaborative skills, insight generation..."</p>
              </div>
              <div className="meta-prompt-actions">
                <button className="btn-secondary small">Growth Analytics</button>
                <button className="btn-primary small">Refine Prompt</button>
              </div>
            </div>

            <div className="meta-prompt-card">
              <div className="meta-prompt-header">
                <h4>🎭 Sentiment & Dynamics</h4>
                <div className="prompt-status">
                  <span className="status-badge testing">Testing</span>
                  <span className="version-info">v1.1 vs v1.2</span>
                </div>
              </div>
              <p className="meta-prompt-description">How AI should assess emotional dynamics, energy shifts, and group cohesion.</p>
              <div className="meta-prompt-preview">
                <p><strong>Testing:</strong> Different approaches to measuring emotional intelligence and group dynamics in dialogue flow.</p>
              </div>
              <div className="meta-prompt-actions">
                <button className="btn-secondary small">View Sentiment Data</button>
                <button className="btn-primary small">Compare Results</button>
              </div>
            </div>
          </div>
        </div>

        {/* AI Learning Flywheel */}
        <div className="dashboard-section">
          <h2>🔄 AI Learning Flywheel</h2>
          <p className="section-description">AI analyzes successful dialogues to suggest new prompts and improvements based on real-world patterns.</p>
          
          <div className="learning-stats">
            <div className="stat-card">
              <h4>📊 Dialogues Analyzed</h4>
              <div className="stat-number">247</div>
              <div className="stat-label">Since last month</div>
            </div>
            <div className="stat-card">
              <h4>🎯 Success Patterns</h4>
              <div className="stat-number">18</div>
              <div className="stat-label">Identified patterns</div>
            </div>
            <div className="stat-card">
              <h4>💡 AI Suggestions</h4>
              <div className="stat-number">12</div>
              <div className="stat-label">Pending review</div>
            </div>
            <div className="stat-card">
              <h4>⭐ Adopted Prompts</h4>
              <div className="stat-number">8</div>
              <div className="stat-label">Human-approved</div>
            </div>
          </div>

          <div className="learning-sections">
            <div className="learning-section">
              <h4>🧠 AI-Generated Prompt Suggestions</h4>
              <div className="suggestions-list">
                <div className="suggestion-card">
                  <div className="suggestion-header">
                    <h5>Opening: Intention Setting</h5>
                    <div className="suggestion-meta">
                      <span className="confidence">95% confidence</span>
                      <span className="based-on">Based on 34 successful dialogues</span>
                    </div>
                  </div>
                  <div className="suggestion-content">
                    <p><strong>Suggested Prompt:</strong> "What intention are you bringing to this space, and how do you hope it might serve both your growth and our collective wisdom?"</p>
                    <div className="suggestion-reasoning">
                      <p><strong>AI Analysis:</strong> Prompts combining personal intention with collective purpose showed 23% higher engagement rates and 31% more meaningful connections in opening stages.</p>
                    </div>
                  </div>
                  <div className="suggestion-actions">
                    <button 
                      className="btn-secondary small"
                      onClick={() => handleFeedback('reject', 1)}
                      title="This suggestion doesn't work for my context"
                    >
                      👎 Reject
                    </button>
                    <button 
                      className="btn-secondary small"
                      onClick={() => handleFeedback('edit', 1)}
                      title="Good idea but needs modification"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-primary small"
                      onClick={() => handleFeedback('approve', 1)}
                      title="Add to library and start testing"
                    >
                      ✅ Approve & Test
                    </button>
                  </div>
                </div>

                <div className="suggestion-card">
                  <div className="suggestion-header">
                    <h5>Connect: Vulnerability Bridge</h5>
                    <div className="suggestion-meta">
                      <span className="confidence">87% confidence</span>
                      <span className="based-on">Based on 28 successful dialogues</span>
                    </div>
                  </div>
                  <div className="suggestion-content">
                    <p><strong>Suggested Prompt:</strong> "Share something that's been challenging you lately, and what you're learning from that challenge."</p>
                    <div className="suggestion-reasoning">
                      <p><strong>AI Analysis:</strong> Prompts that invite controlled vulnerability while focusing on growth showed deeper connection formation and 40% more authentic sharing.</p>
                    </div>
                  </div>
                  <div className="suggestion-actions">
                    <button 
                      className="btn-secondary small"
                      onClick={() => handleFeedback('reject', 2)}
                      title="This suggestion doesn't work for my context"
                    >
                      👎 Reject
                    </button>
                    <button 
                      className="btn-secondary small"
                      onClick={() => handleFeedback('edit', 2)}
                      title="Good idea but needs modification"
                    >
                      ✏️ Edit
                    </button>
                    <button 
                      className="btn-primary small"
                      onClick={() => handleFeedback('approve', 2)}
                      title="Add to library and start testing"
                    >
                      ✅ Approve & Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="learning-section">
              <h4>📈 Success Pattern Analysis</h4>
              <div className="patterns-list">
                <div className="pattern-card">
                  <h5>🎯 High-Engagement Patterns</h5>
                  <ul>
                    <li>Questions that combine personal + collective elements (↑31% engagement)</li>
                    <li>Prompts with specific time references ("lately", "recently") (↑18% relevance)</li>
                    <li>Invitations to share challenges + learnings (↑24% depth)</li>
                  </ul>
                </div>
                <div className="pattern-card">
                  <h5>💡 Insight Generation Triggers</h5>
                  <ul>
                    <li>Questions about "what wants to emerge" (↑45% collective insights)</li>
                    <li>Pattern recognition prompts (↑28% synthesis quality)</li>
                    <li>Future-focused possibility questions (↑33% actionable outcomes)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI A/B Testing */}
        <div className="dashboard-section">
          <h2>🧪 AI Model & Prompt Testing</h2>
          <div className="testing-grid">
            <div className="test-card">
              <h4>📝 Summary Generation Test</h4>
              <p>Compare AI-generated summaries from different providers</p>
              <div className="test-status">
                <span className="status-badge running">🔄 Active Test</span>
                <span className="test-stats">12 evaluations • 3 AIs</span>
              </div>
              <div className="test-actions">
                <button className="test-btn primary">View Results</button>
                <button className="test-btn secondary">Configure</button>
              </div>
            </div>
            
            <div className="test-card">
              <h4>💡 Insight Extraction Test</h4>
              <p>Evaluate theme identification and pattern recognition</p>
              <div className="test-status">
                <span className="status-badge pending">⏳ Pending</span>
                <span className="test-stats">0 evaluations • 4 AIs</span>
              </div>
              <div className="test-actions">
                <button className="test-btn primary">Start Test</button>
                <button className="test-btn secondary">Configure</button>
              </div>
            </div>
            
            <div className="test-card">
              <h4>✨ Content Enhancement Test</h4>
              <p>Compare transcript cleanup and enhancement quality</p>
              <div className="test-status">
                <span className="status-badge completed">✅ Completed</span>
                <span className="test-stats">25 evaluations • 3 AIs</span>
              </div>
              <div className="test-actions">
                <button className="test-btn primary">View Results</button>
                <button className="test-btn secondary">Export Data</button>
              </div>
            </div>
          </div>
          
          <div className="create-test-section">
            <button className="create-test-btn">+ Create New A/B Test</button>
          </div>
        </div>

        {/* Performance Analytics */}
        <div className="dashboard-section">
          <h2>📊 AI Performance Analytics</h2>
          <div className="analytics-grid">
            <div className="analytics-card">
              <h4>🏆 Overall AI Rankings</h4>
              <div className="ranking-list">
                <div className="ranking-item">
                  <span className="rank">1st</span>
                  <span className="ai-name">Anthropic Claude</span>
                  <span className="score">87.3%</span>
                  <span className="category">Content Enhancement</span>
                </div>
                <div className="ranking-item">
                  <span className="rank">2nd</span>
                  <span className="ai-name">OpenAI GPT-4</span>
                  <span className="score">84.7%</span>
                  <span className="category">Pattern Recognition</span>
                </div>
                <div className="ranking-item">
                  <span className="rank">3rd</span>
                  <span className="ai-name">xAI Grok</span>
                  <span className="score">82.1%</span>
                  <span className="category">Dialogue Synthesis</span>
                </div>
              </div>
            </div>
            
            <div className="analytics-card">
              <h4>📈 Performance Trends</h4>
              <div className="trend-stats">
                <div className="trend-item">
                  <span className="trend-label">Summary Quality</span>
                  <div className="trend-bar">
                    <div className="trend-fill" style={{width: '78%'}}></div>
                  </div>
                  <span className="trend-value">78% consensus</span>
                </div>
                <div className="trend-item">
                  <span className="trend-label">Insight Accuracy</span>
                  <div className="trend-bar">
                    <div className="trend-fill" style={{width: '85%'}}></div>
                  </div>
                  <span className="trend-value">85% consensus</span>
                </div>
                <div className="trend-item">
                  <span className="trend-label">Enhancement Quality</span>
                  <div className="trend-bar">
                    <div className="trend-fill" style={{width: '91%'}}></div>
                  </div>
                  <span className="trend-value">91% consensus</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Evaluation Interface */}
        <div className="dashboard-section">
          <h2>👥 Evaluation Interface</h2>
          <div className="evaluation-demo">
            <div className="evaluation-header">
              <h4>Sample Evaluation: Summary Comparison</h4>
              <p>Participants see this interface to blindly evaluate AI outputs</p>
            </div>
            
            <div className="comparison-grid">
              <div className="comparison-item">
                <h5>Version A</h5>
                <div className="sample-output">
                  "The dialogue revealed three key themes: intergenerational responsibility, systems thinking, and the need for collective action. Participants expressed both grief about environmental loss and hope for future solutions..."
                </div>
                <div className="evaluation-controls">
                  <label>Quality Rating:</label>
                  <div className="rating-stars">★★★★☆</div>
                </div>
              </div>
              
              <div className="comparison-item">
                <h5>Version B</h5>
                <div className="sample-output">
                  "Key insights emerged around climate responsibility across generations, interconnected systems awareness, and collaborative solution-building. The group held space for both environmental grief and transformative possibility..."
                </div>
                <div className="evaluation-controls">
                  <label>Quality Rating:</label>
                  <div className="rating-stars">★★★★★</div>
                </div>
              </div>
            </div>
            
            <div className="evaluation-actions">
              <button className="eval-btn">Rank Preferences</button>
              <button className="eval-btn">Submit Evaluation</button>
            </div>
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="dashboard-section">
          <h2>⚙️ System Diagnostics</h2>
          <div className="diagnostics-grid">
            <div className="diagnostic-card">
              <h4>🤖 AI Provider Status</h4>
              <div className="provider-status-list">
                <div className="provider-status-item">
                  <span className="provider-name">OpenAI GPT-4</span>
                  <span className="status-indicator good">🟢 Online</span>
                  <span className="response-time">245ms avg</span>
                </div>
                <div className="provider-status-item">
                  <span className="provider-name">Anthropic Claude</span>
                  <span className="status-indicator good">🟢 Online</span>
                  <span className="response-time">312ms avg</span>
                </div>
                <div className="provider-status-item">
                  <span className="provider-name">xAI Grok</span>
                  <span className="status-indicator warning">🟡 Slow</span>
                  <span className="response-time">1.2s avg</span>
                </div>
              </div>
            </div>
            
            <div className="diagnostic-card">
              <h4>📈 Usage Statistics</h4>
              <div className="usage-stats">
                <div className="stat-item">
                  <span className="stat-label">Total Evaluations:</span>
                  <span className="stat-value">1,247</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Active Tests:</span>
                  <span className="stat-value">3</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Evaluators:</span>
                  <span className="stat-value">28</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Consensus Rate:</span>
                  <span className="stat-value">84.3%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Data Export */}
        <div className="dashboard-section">
          <h2>📤 Data Export & Analysis</h2>
          <div className="export-tools">
            <div className="export-card">
              <h4>📊 Export Evaluation Data</h4>
              <p>Download comprehensive evaluation results for external analysis</p>
              <div className="export-options">
                <button className="export-btn">📄 CSV Export</button>
                <button className="export-btn">📋 JSON Export</button>
                <button className="export-btn">📈 Statistical Report</button>
              </div>
            </div>
            
            <div className="export-card">
              <h4>🔬 Research Tools</h4>
              <p>Advanced analysis tools for researchers and data scientists</p>
              <div className="export-options">
                <button className="export-btn">📊 Statistical Significance</button>
                <button className="export-btn">🎯 Confidence Intervals</button>
                <button className="export-btn">📈 Trend Analysis</button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }
};

export default SimpleDashboard;











