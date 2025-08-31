import React, { useState, useEffect } from 'react';
import './JourneyInsights.css';

const JourneyInsights = ({ participantId, sessionId }) => {
  const [journeyData, setJourneyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (participantId) {
      fetchJourneyData();
    }
  }, [participantId]);

  const fetchJourneyData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/participants/${participantId}/journey`);
      
      if (response.ok) {
        const data = await response.json();
        setJourneyData(data.journey);
        setError(null);
      } else {
        setError('Unable to load journey data');
      }
    } catch (err) {
      console.error('Journey data fetch error:', err);
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  // Record a contribution for analysis
  const recordContribution = async (content, type = 'transcript') => {
    if (!participantId || !sessionId || !content) return;
    
    try {
      await fetch(`/api/participants/${participantId}/contribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content,
          type
        })
      });
      
      // Refresh journey data after recording contribution
      setTimeout(fetchJourneyData, 1000);
    } catch (err) {
      console.error('Error recording contribution:', err);
    }
  };

  // Expose recordContribution function globally for other components to use
  useEffect(() => {
    window.recordContribution = recordContribution;
    return () => {
      delete window.recordContribution;
    };
  }, [participantId, sessionId]);

  const getQualityColor = (quality) => {
    if (quality >= 4) return '#4CAF50'; // Green
    if (quality >= 3) return '#FF9800'; // Orange
    if (quality >= 2) return '#2196F3'; // Blue
    return '#9E9E9E'; // Grey
  };

  const getCollaborationIcon = (style) => {
    switch (style) {
      case 'catalytic': return '⚡';
      case 'wise': return '🧠';
      case 'supportive': return '🤝';
      case 'emerging': return '🌱';
      default: return '👤';
    }
  };

  const getEngagementIcon = (trend) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '📊';
      default: return '📊';
    }
  };

  if (loading) {
    return (
      <div className="journey-insights loading">
        <div className="loading-spinner"></div>
        <span>Loading your journey...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="journey-insights error">
        <span>⚠️ {error}</span>
      </div>
    );
  }

  if (!journeyData) {
    return (
      <div className="journey-insights empty">
        <span>🌟 Your journey will appear here as you participate</span>
      </div>
    );
  }

  return (
    <div className="journey-insights">
      <div className="journey-header">
        <h4>🌟 Your Journey</h4>
        <span className="participant-name">{journeyData.participantName}</span>
      </div>
      
      <div className="journey-metrics">
        <div className="metric-item">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <div className="metric-label">Contribution Quality</div>
            <div 
              className="metric-value"
              style={{ color: getQualityColor(journeyData.contributionQuality) }}
            >
              {journeyData.contributionQuality.toFixed(1)}/5.0
            </div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">{getCollaborationIcon(journeyData.collaborationStyle)}</div>
          <div className="metric-content">
            <div className="metric-label">Collaboration Style</div>
            <div className="metric-value">{journeyData.collaborationStyle}</div>
          </div>
        </div>

        <div className="metric-item">
          <div className="metric-icon">{getEngagementIcon(journeyData.engagementTrend)}</div>
          <div className="metric-content">
            <div className="metric-label">Engagement</div>
            <div className="metric-value">{journeyData.engagementTrend}</div>
          </div>
        </div>
      </div>

      {journeyData.growthMoments > 0 && (
        <div className="growth-highlights">
          <div className="growth-stat">
            <span className="growth-icon">✨</span>
            <span className="growth-text">
              {journeyData.growthMoments} growth moment{journeyData.growthMoments !== 1 ? 's' : ''}
            </span>
          </div>
          {journeyData.recentGrowthMoments > 0 && (
            <div className="growth-stat recent">
              <span className="growth-icon">🔥</span>
              <span className="growth-text">
                {journeyData.recentGrowthMoments} recent breakthrough{journeyData.recentGrowthMoments !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="journey-stats">
        <div className="stat-item">
          <span className="stat-label">Sessions</span>
          <span className="stat-value">{journeyData.totalSessions}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Contributions</span>
          <span className="stat-value">{journeyData.recentContributions}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Avg Quality</span>
          <span className="stat-value">{journeyData.avgSophistication}</span>
        </div>
      </div>

      <div className="journey-encouragement">
        {journeyData.contributionQuality >= 4 ? (
          <span>🌟 You're making exceptional contributions!</span>
        ) : journeyData.contributionQuality >= 3 ? (
          <span>🚀 Your insights are really valuable!</span>
        ) : journeyData.growthMoments > 0 ? (
          <span>📈 You're growing beautifully!</span>
        ) : (
          <span>🌱 Every contribution helps you grow!</span>
        )}
      </div>
    </div>
  );
};

export default JourneyInsights;



