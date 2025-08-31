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
  const [dashboardMode, setDashboardMode] = useState('configuration'); // 'configuration', 'live', 'analysis', 'developer'
  const [developerAccess, setDeveloperAccess] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);

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

  const handleDeveloperModeAccess = () => {
    if (developerAccess) {
      // Already have access, switch to developer mode
      setDashboardMode('developer');
    } else {
      // Need password, show prompt
      setShowPasswordPrompt(true);
    }
  };

  const handlePasswordSubmit = (password) => {
    // In production, this would be properly secured
    const correctPassword = 'dev2024'; // Simple password for demo
    if (password === correctPassword) {
      setDeveloperAccess(true);
      setDashboardMode('developer');
      setShowPasswordPrompt(false);
    } else {
      alert('Incorrect password. Access denied.');
      setShowPasswordPrompt(false);
    }
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
                onClick={() => setDashboardMode('configuration')}
                title="Configuration Mode - Design dialogues"
              >
                🔧 Config
              </button>
              <button 
                className={`mode-btn ${dashboardMode === 'live' ? 'active' : ''}`}
                onClick={() => setDashboardMode('live')}
                title="Live Mode - Monitor active sessions"
              >
                📡 Live
              </button>
              <button 
                className={`mode-btn ${dashboardMode === 'analysis' ? 'active' : ''}`}
                onClick={() => setDashboardMode('analysis')}
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

      {/* Mode-specific content */}
      {dashboardMode === 'configuration' && renderConfigurationMode()}
      {dashboardMode === 'live' && renderLiveMode()}
      {dashboardMode === 'analysis' && renderAnalysisMode()}
      {dashboardMode === 'developer' && renderDeveloperMode()}
    </div>
  );

  // Configuration Mode - Current functionality
  function renderConfigurationMode() {
    return (
      <>
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
        <div className="dashboard-section live-session">
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

  // Analysis Mode - Retrospective insights
  function renderAnalysisMode() {
    return (
      <>
        {/* Session Archive */}
        <div className="dashboard-section">
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
        <div className="dashboard-section developer-header">
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

        {/* AI A/B Testing */}
        <div className="dashboard-section">
          <h2>🧪 AI A/B Testing</h2>
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


