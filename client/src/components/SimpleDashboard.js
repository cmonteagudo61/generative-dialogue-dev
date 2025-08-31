import React, { useState, useEffect } from 'react';
import DialogueManager from './DialogueManager';
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

const SimpleDashboard = () => {
  const [currentView, setCurrentView] = useState('overview'); // 'overview' or 'dialogues'

  // Flash detection system removed - issue resolved with webpack overlay blocking
  const [systemHealth, setSystemHealth] = useState({
    backend: 'checking...',
    database: 'checking...',
    services: 'checking...'
  });
  const [mockData, setMockData] = useState({
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
        const response = await fetch('http://localhost:5680/health');
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
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleDialogueSelect = (dialogue) => {
    console.log('Selected dialogue:', dialogue);
    // Here you would integrate with your main app routing
    // For now, just log the selection
  };

  const handleReactError = (errorInfo) => {
    console.log('React error caught:', errorInfo);
  };

  if (currentView === 'dialogues') {
    return (
      <ErrorBoundary onError={handleReactError}>
        <DialogueManager onDialogueSelect={handleDialogueSelect} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Debug monitoring completely removed - clean dashboard */}
      <div className="dashboard-header">
        <div className="header-content">
          <div>
            <h1>🎯 Generative Dialogue Dashboard</h1>
            <p className="dashboard-subtitle">Real-time monitoring for hosts, monitors, and observers</p>
          </div>
          <div className="header-nav">
            <button 
              className={`nav-btn ${currentView === 'overview' ? 'active' : ''}`}
              onClick={() => setCurrentView('overview')}
            >
              📊 Overview
            </button>
            <button 
              className={`nav-btn ${currentView === 'dialogues' ? 'active' : ''}`}
              onClick={() => setCurrentView('dialogues')}
            >
              🎭 Dialogues
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default SimpleDashboard;
