import React, { useState, useEffect, useCallback, useRef } from 'react';
import './DashboardPage.css';

const DashboardPage = ({ sessionId, isHost }) => {
  const [participants, setParticipants] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalParticipants: 0,
    activeParticipants: 0,
    deviceBreakdown: { mobile: 0, tablet: 0, desktop: 0 },
    participationStats: { totalSpeakingTime: 0, totalContributions: 0, totalVotes: 0 },
    connectionQuality: { good: 0, fair: 0, poor: 0 }
  });
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(sessionId || null);
  const [wsConnection, setWsConnection] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [systemHealth, setSystemHealth] = useState({
    backend: 'unknown',
    database: 'unknown',
    websocket: 'unknown'
  });
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const wsRef = useRef(null);
  const refreshInterval = useRef(null);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/dashboard-ws`;
        
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        
        ws.onopen = () => {
          console.log('📊 Dashboard WebSocket connected');
          setConnectionStatus('connected');
          setSystemHealth(prev => ({ ...prev, websocket: 'good' }));
          
          // Subscribe to session updates
          if (selectedSession) {
            ws.send(JSON.stringify({ 
              type: 'subscribe', 
              sessionId: selectedSession 
            }));
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            handleWebSocketMessage(data);
          } catch (error) {
            // Silent error handling to prevent UI flashing
          }
        };
        
        ws.onclose = () => {
          console.log('📊 Dashboard WebSocket disconnected');
          setConnectionStatus('disconnected');
          setSystemHealth(prev => ({ ...prev, websocket: 'poor' }));
          
          // Disable automatic reconnection to prevent flashing
          // setTimeout(connectWebSocket, 3000);
        };
        
        ws.onerror = (error) => {
          // Silent error handling to prevent UI flashing
          setConnectionStatus('error');
        };
        
        setWsConnection(ws);
      } catch (error) {
        // Silent error handling to prevent UI flashing
        // DISABLED: Potential cause of dashboard flashing
        // setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedSession]);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((data) => {
    const timestamp = new Date().toLocaleTimeString();
    
    switch (data.type) {
      case 'participant-joined':
        addRealtimeEvent(`👤 ${data.participant.name} joined`, 'participant', timestamp);
        fetchParticipants();
        break;
        
      case 'participant-left':
        addRealtimeEvent(`👋 ${data.participant.name} left`, 'participant', timestamp);
        fetchParticipants();
        break;
        
      case 'transcript-update':
        addRealtimeEvent(`🎤 ${data.participantName}: ${data.text.substring(0, 50)}...`, 'transcript', timestamp);
        break;
        
      case 'ai-processing':
        addRealtimeEvent(`🤖 AI processing: ${data.service}`, 'ai', timestamp);
        break;
        
      case 'vote-cast':
        addRealtimeEvent(`🗳️ Vote cast: ${data.vote}`, 'vote', timestamp);
        fetchAnalytics();
        break;
        
      case 'system-health':
        setSystemHealth(data.health);
        break;
        
      default:
        console.log('Unknown dashboard message:', data);
    }
  }, []);

  // Add realtime event to the feed
  const addRealtimeEvent = useCallback((message, type, timestamp) => {
    setRealtimeEvents(prev => [
      { id: Date.now(), message, type, timestamp },
      ...prev.slice(0, 49) // Keep last 50 events
    ]);
  }, []);

  // Fetch participants for selected session
  const fetchParticipants = useCallback(async () => {
    if (!selectedSession) return;
    
    try {
      const response = await fetch(`/api/session/${selectedSession}/participants`);
      if (response.ok) {
        const data = await response.json();
        setParticipants(data.participants || []);
        setSystemHealth(prev => ({ ...prev, backend: 'good' }));
      } else {
        setSystemHealth(prev => ({ ...prev, backend: 'poor' }));
      }
    } catch (error) {
      console.error('Failed to fetch participants:', error);
      setSystemHealth(prev => ({ ...prev, backend: 'poor' }));
    }
  }, [selectedSession]);

  // Fetch analytics for selected session
  const fetchAnalytics = useCallback(async () => {
    if (!selectedSession) return;
    
    try {
      const response = await fetch(`/api/session/${selectedSession}/analytics`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics || analytics);
        setSystemHealth(prev => ({ ...prev, database: 'good' }));
      } else {
        setSystemHealth(prev => ({ ...prev, database: 'poor' }));
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setSystemHealth(prev => ({ ...prev, database: 'poor' }));
    }
  }, [selectedSession, analytics]);

  // Fetch available sessions
  const fetchSessions = useCallback(async () => {
    try {
      // This would need a new endpoint to list sessions
      // For now, we'll use mock data
      setSessions([
        { id: selectedSession || 'current', name: 'Current Session', active: true },
        { id: 'demo-1', name: 'Demo Session 1', active: false },
        { id: 'test-2', name: 'Test Session 2', active: false }
      ]);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, [selectedSession]);

  // Periodic data refresh
  useEffect(() => {
    if (selectedSession) {
      fetchParticipants();
      fetchAnalytics();
      
      // Set up periodic refresh
      refreshInterval.current = setInterval(() => {
        fetchParticipants();
        fetchAnalytics();
      }, 5000); // Refresh every 5 seconds
      
      return () => {
        if (refreshInterval.current) {
          clearInterval(refreshInterval.current);
        }
      };
    }
  }, [selectedSession, fetchParticipants, fetchAnalytics]);

  // Initial data load
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Format time duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get connection quality color
  const getQualityColor = (quality) => {
    switch (quality) {
      case 'good': return '#4CAF50';
      case 'fair': return '#FF9800';
      case 'poor': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  // Get device icon
  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'desktop': return '💻';
      default: return '💻';
    }
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <h1>🎯 Generative Dialogue Dashboard</h1>
          <div className="connection-status">
            <span className={`status-indicator ${connectionStatus}`}>
              {connectionStatus === 'connected' ? '🟢' : connectionStatus === 'error' ? '🔴' : '🟡'}
            </span>
            <span>{connectionStatus}</span>
          </div>
        </div>
      </header>

      {/* System Health Bar */}
      <div className="system-health">
        <div className="health-item">
          <span>Backend</span>
          <div 
            className="health-indicator"
            style={{ backgroundColor: getQualityColor(systemHealth.backend) }}
          />
        </div>
        <div className="health-item">
          <span>Database</span>
          <div 
            className="health-indicator"
            style={{ backgroundColor: getQualityColor(systemHealth.database) }}
          />
        </div>
        <div className="health-item">
          <span>WebSocket</span>
          <div 
            className="health-indicator"
            style={{ backgroundColor: getQualityColor(systemHealth.websocket) }}
          />
        </div>
      </div>

      {/* Session Selector */}
      <div className="session-selector">
        <label>Active Session:</label>
        <select 
          value={selectedSession || ''} 
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          <option value="">Select a session...</option>
          {sessions.map(session => (
            <option key={session.id} value={session.id}>
              {session.name} {session.active ? '(Active)' : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedSession && (
        <>
          {/* Analytics Overview */}
          <div className="analytics-overview">
            <div className="metric-card">
              <div className="metric-value">{analytics.totalParticipants}</div>
              <div className="metric-label">Total Participants</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{analytics.activeParticipants}</div>
              <div className="metric-label">Active Now</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{analytics.participationStats.totalContributions}</div>
              <div className="metric-label">Contributions</div>
            </div>
            <div className="metric-card">
              <div className="metric-value">{formatDuration(analytics.participationStats.totalSpeakingTime)}</div>
              <div className="metric-label">Speaking Time</div>
            </div>
          </div>

          {/* Growth Tracking Overview */}
          <div className="growth-tracking-overview">
            <h3>🌟 Journey & Growth Tracking</h3>
            <div className="growth-features">
              <div className="growth-feature">
                <span className="growth-icon">📈</span>
                <div className="growth-content">
                  <div className="growth-title">Real-time Analysis</div>
                  <div className="growth-description">AI analyzes every contribution for sophistication, empathy, and creativity</div>
                </div>
              </div>
              <div className="growth-feature">
                <span className="growth-icon">✨</span>
                <div className="growth-content">
                  <div className="growth-title">Growth Moments</div>
                  <div className="growth-description">Breakthrough insights and transformation events detected automatically</div>
                </div>
              </div>
              <div className="growth-feature">
                <span className="growth-icon">🎯</span>
                <div className="growth-content">
                  <div className="growth-title">Journey Dashboard</div>
                  <div className="growth-description">Participants see their personal growth story and collaboration evolution</div>
                </div>
              </div>
              <div className="growth-feature">
                <span className="growth-icon">🧠</span>
                <div className="growth-content">
                  <div className="growth-title">AI Companion</div>
                  <div className="growth-description">Longitudinal tracking across sessions for episodic, developmental & transformational growth</div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Dashboard Grid */}
          <div className="dashboard-grid">
            {/* Participants Panel */}
            <div className="dashboard-panel participants-panel">
              <h3>👥 Participants ({participants.length})</h3>
              <div className="participants-list">
                {participants.map(participant => (
                  <div key={participant.participantId} className="participant-item">
                    <div className="participant-info">
                      <div className="participant-name">
                        {getDeviceIcon(participant.deviceType)} {participant.name}
                      </div>
                      <div className="participant-details">
                        <span className="role-badge">{participant.role}</span>
                        {participant.organization && (
                          <span className="org-badge">{participant.organization}</span>
                        )}
                      </div>
                    </div>
                    <div className="participant-status">
                      <div className="connection-quality">
                        <div 
                          className="quality-dot"
                          style={{ backgroundColor: getQualityColor(participant.connectionQuality?.network || 'good') }}
                          title={`Connection: ${participant.connectionQuality?.network || 'good'}`}
                        />
                      </div>
                      <div className="last-seen">
                        {participant.isActive ? 'Active' : 'Away'}
                      </div>
                    </div>
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="empty-state">No participants yet</div>
                )}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="dashboard-panel device-panel">
              <h3>📱 Device Breakdown</h3>
              <div className="device-stats">
                <div className="device-stat">
                  <span>💻 Desktop</span>
                  <span>{analytics.deviceBreakdown.desktop}</span>
                </div>
                <div className="device-stat">
                  <span>📱 Mobile</span>
                  <span>{analytics.deviceBreakdown.mobile}</span>
                </div>
                <div className="device-stat">
                  <span>📱 Tablet</span>
                  <span>{analytics.deviceBreakdown.tablet}</span>
                </div>
              </div>
            </div>

            {/* Real-time Events */}
            <div className="dashboard-panel events-panel">
              <h3>⚡ Live Events</h3>
              <div className="events-feed">
                {realtimeEvents.map(event => (
                  <div key={event.id} className={`event-item ${event.type}`}>
                    <span className="event-time">{event.timestamp}</span>
                    <span className="event-message">{event.message}</span>
                  </div>
                ))}
                {realtimeEvents.length === 0 && (
                  <div className="empty-state">No recent events</div>
                )}
              </div>
            </div>

            {/* Connection Quality */}
            <div className="dashboard-panel quality-panel">
              <h3>📶 Connection Quality</h3>
              <div className="quality-stats">
                <div className="quality-stat">
                  <span style={{ color: getQualityColor('good') }}>● Good</span>
                  <span>{analytics.connectionQuality.good}</span>
                </div>
                <div className="quality-stat">
                  <span style={{ color: getQualityColor('fair') }}>● Fair</span>
                  <span>{analytics.connectionQuality.fair}</span>
                </div>
                <div className="quality-stat">
                  <span style={{ color: getQualityColor('poor') }}>● Poor</span>
                  <span>{analytics.connectionQuality.poor}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
