import React, { useState, useEffect, useCallback, useRef } from 'react';
import './ScalableSessionOrchestrator.css';

const ScalableSessionOrchestrator = ({ 
  dialogueConfig, 
  participants = [], 
  facilitatorRole = 'master', // 'master', 'regional', 'zone', 'observer'
  facilitatorId,
  onSessionUpdate
}) => {
  // Scalable session state
  const [sessionState, setSessionState] = useState({
    status: 'preparing',
    sessionId: `session_${Date.now()}`,
    totalParticipants: participants.length,
    facilitatorHierarchy: {},
    globalMetrics: {},
    startedAt: null,
    currentStage: 'connect',
    stageProgress: 0
  });

  // Hierarchical organization
  const [organizationStructure, setOrganizationStructure] = useState({
    regions: [],
    zones: [],
    rooms: [],
    facilitators: []
  });

  // Real-time connection management
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    reconnectAttempts: 0,
    lastHeartbeat: null
  });

  // View management for different scales
  const [currentView, setCurrentView] = useState('overview'); // 'overview', 'regional', 'zone', 'room'
  const [selectedScope, setSelectedScope] = useState(null); // Which region/zone/room is selected
  
  // WebSocket connection (will be implemented)
  // eslint-disable-next-line no-unused-vars
  const wsRef = useRef(null);
  const heartbeatRef = useRef(null);

  // Auto-organize participants into hierarchical structure
  const organizeParticipants = useCallback((participantList) => {
    const totalParticipants = participantList.length;
    
    // Calculate optimal structure based on participant count
    const structure = calculateOptimalStructure(totalParticipants);
    
    // Assign participants using diversity algorithms
    const assignments = assignParticipantsIntelligently(participantList, structure);
    
    setOrganizationStructure(assignments);
    
    return assignments;
  }, []);

  // Calculate optimal hierarchical structure
  const calculateOptimalStructure = (totalParticipants) => {
    const roomSize = 4; // Optimal intimate dialogue size
    const zonesPerRegion = 5; // Each zone facilitator manages 5 rooms (20 people)
    const regionsPerMaster = 5; // Each regional coordinator manages 5 zones (100 people)
    
    const totalRooms = Math.ceil(totalParticipants / roomSize);
    const totalZones = Math.ceil(totalRooms / zonesPerRegion);
    const totalRegions = Math.ceil(totalZones / regionsPerMaster);
    
    return {
      totalParticipants,
      totalRooms,
      totalZones,
      totalRegions,
      roomSize,
      zonesPerRegion,
      regionsPerMaster,
      facilitatorsNeeded: {
        master: 1,
        regional: totalRegions,
        zone: totalZones,
        total: 1 + totalRegions + totalZones
      }
    };
  };

  // Intelligent participant assignment with diversity optimization
  const assignParticipantsIntelligently = (participantList, structure) => {
    const shuffled = [...participantList].sort(() => Math.random() - 0.5);
    
    const regions = [];
    const zones = [];
    const rooms = [];
    
    let participantIndex = 0;
    
    // Create hierarchical structure
    for (let regionIndex = 0; regionIndex < structure.totalRegions; regionIndex++) {
      const region = {
        id: `region_${regionIndex}`,
        name: `Region ${String.fromCharCode(65 + regionIndex)}`, // A, B, C...
        zones: [],
        facilitatorId: null, // Will be assigned when facilitators join
        metrics: {
          totalParticipants: 0,
          activeRooms: 0,
          engagementScore: 0
        }
      };
      
      // Create zones within region
      const zonesInRegion = Math.min(structure.zonesPerRegion, structure.totalZones - (regionIndex * structure.zonesPerRegion));
      
      for (let zoneIndex = 0; zoneIndex < zonesInRegion; zoneIndex++) {
        const globalZoneIndex = (regionIndex * structure.zonesPerRegion) + zoneIndex;
        const zone = {
          id: `zone_${globalZoneIndex}`,
          name: `Zone ${region.name}${zoneIndex + 1}`,
          regionId: region.id,
          rooms: [],
          facilitatorId: null,
          metrics: {
            totalParticipants: 0,
            activeRooms: 0,
            engagementScore: 0
          }
        };
        
        // Create rooms within zone
        const roomsInZone = Math.min(structure.zonesPerRegion, Math.ceil((structure.totalRooms - (globalZoneIndex * structure.zonesPerRegion))));
        
        for (let roomIndex = 0; roomIndex < roomsInZone; roomIndex++) {
          const globalRoomIndex = (globalZoneIndex * structure.zonesPerRegion) + roomIndex;
          if (globalRoomIndex >= structure.totalRooms) break;
          
          const room = {
            id: `room_${globalRoomIndex}`,
            name: `Room ${zone.name}.${roomIndex + 1}`,
            zoneId: zone.id,
            regionId: region.id,
            participants: [],
            metrics: {
              transcriptEntries: 0,
              engagementScore: 0,
              lastActivity: null
            },
            status: 'preparing'
          };
          
          // Assign participants to room
          const participantsInRoom = Math.min(structure.roomSize, participantList.length - participantIndex);
          for (let i = 0; i < participantsInRoom; i++) {
            if (participantIndex < participantList.length) {
              room.participants.push({
                ...shuffled[participantIndex],
                roomId: room.id,
                zoneId: zone.id,
                regionId: region.id
              });
              participantIndex++;
            }
          }
          
          zone.metrics.totalParticipants += room.participants.length;
          zone.rooms.push(room.id);
          rooms.push(room);
        }
        
        region.metrics.totalParticipants += zone.metrics.totalParticipants;
        region.metrics.activeRooms += zone.rooms.length;
        region.zones.push(zone.id);
        zones.push(zone);
      }
      
      regions.push(region);
    }
    
    return {
      regions,
      zones,
      rooms,
      structure,
      facilitators: [] // Will be populated as facilitators join
    };
  };

  // Initialize session with participant organization
  useEffect(() => {
    if (participants.length > 0) {
      const organization = organizeParticipants(participants);
      console.log('Session organized for', participants.length, 'participants:', organization);
    }
  }, [participants, organizeParticipants]);

  // Simulate WebSocket connection (will be real WebSocket)
  const initializeConnection = useCallback(() => {
    // Mock WebSocket connection
    setConnectionState(prev => ({
      ...prev,
      isConnected: true,
      lastHeartbeat: Date.now()
    }));
    
    // Start heartbeat
    heartbeatRef.current = setInterval(() => {
      setConnectionState(prev => ({
        ...prev,
        lastHeartbeat: Date.now()
      }));
    }, 5000);
    
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const cleanup = initializeConnection();
    return cleanup;
  }, [initializeConnection]);

  // Calculate system performance metrics
  const calculateSystemLoad = () => {
    const totalRooms = organizationStructure.rooms.length;
    const activeRooms = organizationStructure.rooms.filter(room => room.status === 'active').length;
    
    return {
      roomUtilization: totalRooms > 0 ? (activeRooms / totalRooms) * 100 : 0,
      connectionHealth: connectionState.isConnected ? 100 : 0,
      processingLoad: Math.min(100, (activeRooms * 2)), // Simulate processing load
      memoryUsage: Math.min(100, (totalRooms * 0.5)) // Simulate memory usage
    };
  };

  // Calculate global metrics from all regions/zones/rooms
  const calculateGlobalMetrics = useCallback(() => {
    const metrics = {
      totalParticipants: organizationStructure.rooms.reduce((sum, room) => sum + room.participants.length, 0),
      totalRooms: organizationStructure.rooms.length,
      totalZones: organizationStructure.zones.length,
      totalRegions: organizationStructure.regions.length,
      activeRooms: organizationStructure.rooms.filter(room => room.status === 'active').length,
      averageEngagement: organizationStructure.rooms.reduce((sum, room) => sum + (room.metrics.engagementScore || 0), 0) / organizationStructure.rooms.length,
      totalTranscriptEntries: organizationStructure.rooms.reduce((sum, room) => sum + (room.metrics.transcriptEntries || 0), 0),
      facilitatorsOnline: organizationStructure.facilitators.filter(f => f.status === 'online').length,
      systemLoad: calculateSystemLoad()
    };
    
    setSessionState(prev => ({
      ...prev,
      globalMetrics: metrics
    }));
    
    return metrics;
  }, [organizationStructure, calculateSystemLoad]);

  // Update metrics periodically
  useEffect(() => {
    const interval = setInterval(() => {
      calculateGlobalMetrics();
    }, 10000); // Update every 10 seconds
    
    return () => clearInterval(interval);
  }, [calculateGlobalMetrics]);

  // Render different views based on facilitator role and current view
  const renderCurrentView = () => {
    switch (facilitatorRole) {
      case 'master':
        return (
          <MasterOrchestratorView 
            sessionState={sessionState}
            organizationStructure={organizationStructure}
            currentView={currentView}
            selectedScope={selectedScope}
            onViewChange={setCurrentView}
            onScopeSelect={setSelectedScope}
            connectionState={connectionState}
            onSessionUpdate={onSessionUpdate}
          />
        );
      case 'regional':
        return (
          <RegionalCoordinatorView 
            sessionState={sessionState}
            organizationStructure={organizationStructure}
            facilitatorId={facilitatorId}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        );
      case 'zone':
        return (
          <ZoneFacilitatorView 
            sessionState={sessionState}
            organizationStructure={organizationStructure}
            facilitatorId={facilitatorId}
            currentView={currentView}
            onViewChange={setCurrentView}
          />
        );
      default:
        return (
          <ObserverView 
            sessionState={sessionState}
            organizationStructure={organizationStructure}
          />
        );
    }
  };

  return (
    <div className="scalable-session-orchestrator">
      {renderCurrentView()}
    </div>
  );
};

// Master Orchestrator View (500+ participants)
const MasterOrchestratorView = ({ 
  sessionState, 
  organizationStructure, 
  currentView, 
  selectedScope,
  onViewChange, 
  onScopeSelect,
  connectionState,
  onSessionUpdate
}) => {
  return (
    <div className="master-orchestrator-view">
      {/* Global Header */}
      <div className="global-header">
        <h1>🌐 Global Dialogue Orchestrator</h1>
        <button 
          className="close-session-btn"
          onClick={() => onSessionUpdate && onSessionUpdate()}
          title="Close Session"
        >
          ✕
        </button>
        <div className="global-stats">
          <div className="stat-card">
            <div className="stat-value">{sessionState.globalMetrics.totalParticipants || 0}</div>
            <div className="stat-label">Participants</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{sessionState.globalMetrics.totalRooms || 0}</div>
            <div className="stat-label">Active Rooms</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{sessionState.globalMetrics.totalRegions || 0}</div>
            <div className="stat-label">Regions</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{Math.round(sessionState.globalMetrics.averageEngagement || 0)}%</div>
            <div className="stat-label">Engagement</div>
          </div>
        </div>
        
        <div className="connection-status">
          <div className={`connection-indicator ${connectionState.isConnected ? 'connected' : 'disconnected'}`}>
            {connectionState.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>
      </div>

      {/* View Navigation */}
      <div className="view-navigation">
        <button 
          className={`nav-btn ${currentView === 'overview' ? 'active' : ''}`}
          onClick={() => onViewChange('overview')}
        >
          🌍 Global Overview
        </button>
        <button 
          className={`nav-btn ${currentView === 'regional' ? 'active' : ''}`}
          onClick={() => onViewChange('regional')}
        >
          🏛️ Regional Management
        </button>
        <button 
          className={`nav-btn ${currentView === 'analytics' ? 'active' : ''}`}
          onClick={() => onViewChange('analytics')}
        >
          📊 Real-time Analytics
        </button>
        <button 
          className={`nav-btn ${currentView === 'collective-wisdom' ? 'active' : ''}`}
          onClick={() => onViewChange('collective-wisdom')}
        >
          🧠 Collective Wisdom
        </button>
      </div>

      {/* Main Content Area */}
      <div className="main-content">
        {currentView === 'overview' && (
          <GlobalOverview 
            organizationStructure={organizationStructure}
            sessionState={sessionState}
            onScopeSelect={onScopeSelect}
          />
        )}
        
        {currentView === 'regional' && (
          <RegionalManagement 
            organizationStructure={organizationStructure}
            selectedScope={selectedScope}
            onScopeSelect={onScopeSelect}
          />
        )}
        
        {currentView === 'analytics' && (
          <RealTimeAnalytics 
            sessionState={sessionState}
            organizationStructure={organizationStructure}
          />
        )}
        
        {currentView === 'collective-wisdom' && (
          <GlobalCollectiveWisdom 
            organizationStructure={organizationStructure}
            sessionState={sessionState}
          />
        )}
      </div>
    </div>
  );
};

// Global Overview Component
const GlobalOverview = ({ organizationStructure, sessionState, onScopeSelect }) => {
  // Generate mock regions if none exist (for demo purposes)
  const displayRegions = organizationStructure.regions.length > 0 
    ? organizationStructure.regions 
    : generateMockRegions(sessionState.globalMetrics.totalParticipants || 100);

  return (
    <div className="global-overview">
      <div className="regions-grid">
        {displayRegions.map(region => (
          <div 
            key={region.id} 
            className="region-card"
            onClick={() => onScopeSelect(region)}
          >
            <div className="region-header">
              <h3>{region.name}</h3>
              <div className="region-status">
                {region.facilitatorId ? '👤 Facilitated' : '🤖 Auto-managed'}
              </div>
            </div>
            
            <div className="region-metrics">
              <div className="metric">
                <span className="metric-icon">👥</span>
                <span className="metric-value">{region.metrics.totalParticipants}</span>
                <span className="metric-label">Participants</span>
              </div>
              <div className="metric">
                <span className="metric-icon">🏠</span>
                <span className="metric-value">{region.metrics.activeRooms}</span>
                <span className="metric-label">Rooms</span>
              </div>
              <div className="metric">
                <span className="metric-icon">📈</span>
                <span className="metric-value">{Math.round(region.metrics.engagementScore)}%</span>
                <span className="metric-label">Engagement</span>
              </div>
            </div>
            
            <div className="region-zones">
              <span className="zones-count">{region.zones.length} zones active</span>
            </div>
          </div>
        ))}
      </div>
      
      {displayRegions.length === 0 && (
        <div className="no-regions">
          <h3>🚀 Ready to Scale</h3>
          <p>Add participants to automatically organize into regions and zones</p>
        </div>
      )}
    </div>
  );
};

// Generate mock regions for demo
const generateMockRegions = (totalParticipants) => {
  const participantsPerRegion = 20;
  const regionCount = Math.ceil(totalParticipants / participantsPerRegion);
  
  return Array.from({ length: Math.min(regionCount, 5) }, (_, i) => ({
    id: `region_${i}`,
    name: `Region ${String.fromCharCode(65 + i)}`,
    zones: Array.from({ length: 5 }, (_, j) => `zone_${i}_${j}`),
    facilitatorId: i % 2 === 0 ? `facilitator_${i}` : null,
    metrics: {
      totalParticipants: Math.min(participantsPerRegion, totalParticipants - (i * participantsPerRegion)),
      activeRooms: 5,
      engagementScore: 75 + Math.random() * 20 // 75-95%
    }
  }));
};

// Placeholder components for other views
const RegionalManagement = ({ organizationStructure, selectedScope, onScopeSelect }) => (
  <div className="regional-management">
    <h2>🏛️ Regional Management</h2>
    <p>Detailed regional coordination interface</p>
  </div>
);

const RealTimeAnalytics = ({ sessionState, organizationStructure }) => (
  <div className="real-time-analytics">
    <h2>📊 Real-time Analytics</h2>
    <p>Live metrics and performance monitoring</p>
  </div>
);

const GlobalCollectiveWisdom = ({ organizationStructure, sessionState }) => (
  <div className="global-collective-wisdom">
    <h2>🧠 Global Collective Wisdom</h2>
    <p>Emergent insights from all regions and zones</p>
  </div>
);

// Placeholder components for other facilitator roles
const RegionalCoordinatorView = ({ sessionState, organizationStructure, facilitatorId }) => (
  <div className="regional-coordinator-view">
    <h2>🏛️ Regional Coordinator Dashboard</h2>
    <p>Managing 100 participants across 5 zones</p>
  </div>
);

const ZoneFacilitatorView = ({ sessionState, organizationStructure, facilitatorId }) => (
  <div className="zone-facilitator-view">
    <h2>🎯 Zone Facilitator Dashboard</h2>
    <p>Managing 20 participants across 5 rooms</p>
  </div>
);

const ObserverView = ({ sessionState, organizationStructure }) => (
  <div className="observer-view">
    <h2>👁️ Observer Dashboard</h2>
    <p>Read-only view of session progress</p>
  </div>
);

export default ScalableSessionOrchestrator;
