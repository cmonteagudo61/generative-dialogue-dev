import React, { useState, useEffect, useRef, useCallback } from 'react';
import { buildApiUrl } from '../config/api';
import './LiveAIInsights.css';

/**
 * LiveAIInsights Component
 * Displays real-time AI processing insights during video calls
 * Shows themes, speaker analysis, collective wisdom, and conversation flow
 */
const LiveAIInsights = ({ 
  transcripts = [],
  onProcessTranscript,
  position = 'right', // 'left', 'right', 'bottom'
  minimized = false,
  onToggleMinimized 
}) => {
  const [insights, setInsights] = useState({
    themes: [],
    speakers: {},
    sentiment: 'neutral',
    keywords: [],
    summary: '',
    collectiveWisdom: []
  });
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastProcessedLength, setLastProcessedLength] = useState(0);
  const [processingQueue, setProcessingQueue] = useState([]);
  const processTimerRef = useRef(null);
  
  /**
   * Process transcript with AI to generate insights
   */
  const processWithAI = useCallback(async (transcript) => {
    console.log('🧠 processWithAI called with transcript length:', transcript.length);
    
    if (!transcript || transcript.length < 50) {
      console.log('🧠 processWithAI: Transcript too short, skipping...', { length: transcript.length });
      return; // Minimum length for meaningful analysis
    }
    
    console.log('🧠 processWithAI: Starting AI processing...');
    setIsProcessing(true);
    
    try {
      console.log('🧠 processWithAI: Making API calls to AI endpoints...');
      
      // Call AI processing endpoints
      const responses = await Promise.allSettled([
        // Get themes
        fetch(buildApiUrl('/api/ai/themes'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        }).then(res => {
          console.log('🧠 Themes API response status:', res.status);
          return res.json();
        }),
        
        // Get summary
        fetch(buildApiUrl('/api/ai/summarize'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        }).then(res => {
          console.log('🧠 Summary API response status:', res.status);
          return res.json();
        }),
        
        // Get formatted version for keywords
        fetch(buildApiUrl('/api/ai/format'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transcript })
        }).then(res => {
          console.log('🧠 Format API response status:', res.status);
          return res.json();
        })
      ]);
      
      console.log('🧠 processWithAI: All API calls completed', responses);
      
      // Process results
      const [themesResult, summaryResult, formatResult] = responses;
      
      const newInsights = { ...insights };
      
      if (themesResult.status === 'fulfilled' && themesResult.value?.themes) {
        console.log('🧠 processWithAI: Themes result:', themesResult.value.themes);
        newInsights.themes = Array.isArray(themesResult.value.themes) 
          ? themesResult.value.themes 
          : [themesResult.value.themes];
      } else {
        console.log('🧠 processWithAI: Themes failed:', themesResult);
      }
      
      if (summaryResult.status === 'fulfilled' && summaryResult.value?.summary) {
        console.log('🧠 processWithAI: Summary result:', summaryResult.value.summary);
        newInsights.summary = summaryResult.value.summary;
      } else {
        console.log('🧠 processWithAI: Summary failed:', summaryResult);
      }
      
      if (formatResult.status === 'fulfilled' && formatResult.value?.formatted) {
        console.log('🧠 processWithAI: Format result:', formatResult.value.formatted);
        // Extract keywords from formatted text
        const formatted = formatResult.value.formatted;
        const keywordMatches = formatted.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
        newInsights.keywords = [...new Set(keywordMatches)].slice(0, 8); // Top 8 unique keywords
        console.log('🧠 processWithAI: Extracted keywords:', newInsights.keywords);
      } else {
        console.log('🧠 processWithAI: Format failed:', formatResult);
      }
      
      console.log('🧠 processWithAI: Final insights:', newInsights);
      setInsights(newInsights);
      onProcessTranscript?.(newInsights);
      
    } catch (error) {
      console.error('🧠 Error processing transcript with AI:', error);
    } finally {
      setIsProcessing(false);
      console.log('🧠 processWithAI: Processing completed');
    }
  }, [onProcessTranscript]); // Removed insights from dependencies to prevent re-renders
  
  /**
   * Debounced processing of transcripts
   */
  useEffect(() => {
    console.log('🧠 LiveAIInsights: transcripts updated', { 
      length: transcripts.length, 
      lastProcessedLength,
      transcripts: transcripts.slice(-3) // Show last 3 for debugging
    });
    
    if (transcripts.length > lastProcessedLength) {
      console.log('🧠 LiveAIInsights: New transcripts detected, scheduling AI processing...');
      
      // Clear existing timer
      if (processTimerRef.current) {
        clearTimeout(processTimerRef.current);
        console.log('🧠 LiveAIInsights: Cleared existing processing timer');
      }
      
      // Process after a delay to batch updates
      processTimerRef.current = setTimeout(() => {
        const fullTranscript = transcripts.join(' ');
        console.log('🧠 LiveAIInsights: Starting AI processing for transcript:', fullTranscript.substring(0, 100) + '...');
        processWithAI(fullTranscript);
        setLastProcessedLength(transcripts.length);
      }, 3000); // Process every 3 seconds
      
      console.log('🧠 LiveAIInsights: AI processing scheduled for 3 seconds');
    } else {
      console.log('🧠 LiveAIInsights: No new transcripts to process');
    }
    
    return () => {
      if (processTimerRef.current) {
        clearTimeout(processTimerRef.current);
      }
    };
  }, [transcripts, processWithAI]); // Removed lastProcessedLength to prevent infinite loop
  
  /**
   * Format sentiment color
   */
  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#f44336';
      case 'neutral': return '#2196F3';
      default: return '#757575';
    }
  };
  
  if (minimized) {
    return (
      <div className={`live-ai-insights minimized ${position}`} onClick={onToggleMinimized}>
        <div className="minimized-indicator">
          <span className="ai-icon">🧠</span>
          <span className="insight-count">{insights.themes.length}</span>
          {isProcessing && <span className="processing-dot"></span>}
        </div>
      </div>
    );
  }
  
  return (
    <div className={`live-ai-insights expanded ${position}`}>
      <div className="insights-header">
        <div className="header-left">
          <span className="ai-icon">🧠</span>
          <h3>Live AI Insights</h3>
          {isProcessing && <span className="processing-indicator">Processing...</span>}
        </div>
        <button className="minimize-btn" onClick={onToggleMinimized}>
          <span>−</span>
        </button>
      </div>
      
      <div className="insights-content">
        {/* Themes Section */}
        <div className="insight-section">
          <h4>🎯 Emerging Themes</h4>
          <div className="themes-list">
            {insights.themes.length > 0 ? (
              insights.themes.map((theme, index) => (
                <div key={index} className="theme-item">
                  <span className="theme-bullet">•</span>
                  <span className="theme-text">{theme}</span>
                </div>
              ))
            ) : (
              <p className="no-data">Analyzing conversation patterns...</p>
            )}
          </div>
        </div>
        
        {/* Keywords Section */}
        <div className="insight-section">
          <h4>🔑 Key Concepts</h4>
          <div className="keywords-container">
            {insights.keywords.length > 0 ? (
              insights.keywords.map((keyword, index) => (
                <span key={index} className="keyword-tag">
                  {keyword}
                </span>
              ))
            ) : (
              <p className="no-data">Extracting key concepts...</p>
            )}
          </div>
        </div>
        
        {/* Summary Section */}
        <div className="insight-section">
          <h4>📝 AI Summary</h4>
          <div className="summary-content">
            {insights.summary ? (
              <p className="summary-text">{insights.summary}</p>
            ) : (
              <p className="no-data">Generating summary...</p>
            )}
          </div>
        </div>
        
        {/* Conversation Health */}
        <div className="insight-section">
          <h4>💬 Conversation Flow</h4>
          <div className="conversation-stats">
            <div className="stat-item">
              <span className="stat-label">Sentiment:</span>
              <span 
                className="stat-value sentiment" 
                style={{ color: getSentimentColor(insights.sentiment) }}
              >
                {insights.sentiment}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Transcripts:</span>
              <span className="stat-value">{transcripts.length}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Insights:</span>
              <span className="stat-value">{insights.themes.length}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="insights-footer">
        <div className="ai-status">
          <span className="service-tag">Powered by Grok AI</span>
          {isProcessing && <span className="processing-animation">⟳</span>}
        </div>
      </div>
    </div>
  );
};

export default LiveAIInsights; 