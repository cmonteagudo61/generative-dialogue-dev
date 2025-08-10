import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './BottomContentArea.css';

const BottomContentArea = ({ currentPage, voteTallies: externalTallies }) => {
  const [activeTab, setActiveTab] = useState(null); // Start with no active tab
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('Disconnected');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [aiProcessedTranscript, setAiProcessedTranscript] = useState('');
  const [aiEnhancedText, setAiEnhancedText] = useState('');
  const [aiSummaryText, setAiSummaryText] = useState('');
  const [aiThemesText, setAiThemesText] = useState('');
  const [aiServiceUsed, setAiServiceUsed] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isEditingAI, setIsEditingAI] = useState(false);
  const [editedAiText, setEditedAiText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingThemes, setIsEditingThemes] = useState(false);
  const [voteTallies, setVoteTallies] = useState({ up: 0, down: 0, total: 0 });
  const [sessionId, setSessionId] = useState('');
  const [breakoutId, setBreakoutId] = useState('');

  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const connectionLockRef = useRef(false);
  const CONNECTION_DEBOUNCE_MS = 2000;
  const API_BASE = 'http://localhost:5680';
  
  const stopRealTimeTranscription = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try { wsRef.current.send(JSON.stringify({ type: 'stop' })); } catch (e) {}
      try { wsRef.current.close(); } catch (e) {}
    }
    setIsRecording(false);
  }, []);

  const startRealTimeTranscription = useCallback(() => {
    if (connectionLockRef.current || isConnecting) {
      console.warn('⚠️ Connection attempt blocked by lock or already in progress.');
      return;
    }

    const now = Date.now();
    if (now - lastConnectionAttempt < CONNECTION_DEBOUNCE_MS) {
      console.warn('⚠️ Connection attempt blocked by debounce.');
      return;
    }

    connectionLockRef.current = true;
    setIsConnecting(true);
    setLastConnectionAttempt(now);
    setTranscriptionStatus('Connecting...');

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        streamRef.current = stream;
        const newMediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = newMediaRecorder;

        wsRef.current = new WebSocket('ws://localhost:5680/realtime');

        wsRef.current.onopen = () => {
          console.log('🔌 WebSocket connection established.');
          setTranscriptionStatus('Connected');
          
          // Send start command to backend
          console.log('🚀 Sending start command to backend...');
          wsRef.current.send(JSON.stringify({ type: 'start' }));
          setTranscriptionStatus('Recording');
          
          if (mediaRecorderRef.current) {
            mediaRecorderRef.current.start(500);
          }
        };

        wsRef.current.onmessage = event => {
          console.log('🔍 WebSocket message received:', event.data);
          const data = JSON.parse(event.data);
          if (data.type === 'transcript' && data.isFinal) {
            console.log('📝 Final transcript received:', data.transcript);
            setFinalTranscript(prev => `${prev}\n${data.transcript}`);
          } else if (data.type === 'transcript' && !data.isFinal) {
            console.log('📝 Interim transcript received:', data.transcript);
          } else if (data.type === 'status') {
            console.log('📊 Status message:', data.message);
          } else if (data.type === 'error') {
            console.error('❌ Error message:', data.message);
          }
        };

        wsRef.current.onerror = error => {
          console.error('WebSocket Error:', error);
          setTranscriptionStatus('Error');
          stopRealTimeTranscription();
        };

        wsRef.current.onclose = () => {
          console.log('🔌 WebSocket connection closed.');
          setTranscriptionStatus('Disconnected');
          stopRealTimeTranscription();
        };

        newMediaRecorder.ondataavailable = event => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(event.data);
          }
        };

        setIsRecording(true);
      })
      .catch(err => {
        console.error('Error getting user media:', err);
        setTranscriptionStatus('Error');
      })
      .finally(() => {
        connectionLockRef.current = false;
        setIsConnecting(false);
      });
  }, [isConnecting, lastConnectionAttempt, stopRealTimeTranscription]);
  
  const startRecording = () => {
    console.log('🎤 Start recording clicked');
    startRealTimeTranscription();
  };

  const stopRecording = () => {
    stopRealTimeTranscription();
  };

  const clearTranscription = useCallback(() => {
    stopRealTimeTranscription();
    setFinalTranscript('');
    setAiProcessedTranscript('');
    setAiEnhancedText('');
    setAiSummaryText('');
    setAiThemesText('');
    setEditedAiText('');
  }, [stopRealTimeTranscription]);

  // Very small markdown-to-HTML renderer for basic formatting (headings, bold, lists)
  const renderMarkdown = useCallback((text) => {
    if (!text) return '';
    // Escape HTML first
    let safe = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // Headings (support up to 6 levels)
    safe = safe.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>');
    safe = safe.replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>');
    safe = safe.replace(/^####\s+(.*)$/gm, '<h4>$1</h4>');
    safe = safe.replace(/^###\s+(.*)$/gm, '<h4>$1</h4>');
    safe = safe.replace(/^##\s+(.*)$/gm, '<h3>$1</h3>');
    safe = safe.replace(/^#\s+(.*)$/gm, '<h2>$1</h2>');
    // Bold
    safe = safe.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Ordered lists (basic 1., 2., ...)
    safe = safe.replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');
    // Lists (basic)
    safe = safe.replace(/^\s*[-*]\s+(.*)$/gm, '<li>$1</li>');
    // Wrap any consecutive <li> blocks with <ul> (supports single or multiple items)
    safe = safe.replace(/(?:^|\n)((?:<li>.*?<\/li>)(?:\n<li>.*?<\/li>)*)/gs, (match, group) => {
      if (!group || group.trim().length === 0) return match;
      return `\n<ul>${group}</ul>`;
    });
    // Paragraphs: split on double newlines
    const blocks = safe.split(/\n\n+/).map(block => {
      // If already a heading or list, don't wrap in <p>
      if (/^<h[2-4]>/.test(block) || /^<ul>/.test(block)) return block;
      // Convert single newlines to <br>
      const withBreaks = block.replace(/\n/g, '<br/>');
      return `<p>${withBreaks}</p>`;
    });
    return blocks.join('');
  }, []);

  // Rich HTML renderers
  const enhancedHtml = useMemo(() => renderMarkdown(aiEnhancedText), [aiEnhancedText, renderMarkdown]);
  // Make sure lists and emphasis render properly
  const summaryHtml = useMemo(() => renderMarkdown(aiSummaryText), [aiSummaryText, renderMarkdown]);
  const themesHtml = useMemo(() => renderMarkdown(aiThemesText), [aiThemesText, renderMarkdown]);

  // Show only the last 3 lines from the live transcript for compact display
  const lastThreeLines = useMemo(() => {
    if (!finalTranscript) return '';
    const lines = finalTranscript.split(/\n+/);
    const last3 = lines.slice(-3);
    return last3.join('\n');
  }, [finalTranscript]);

  const processTranscriptWithAI = useCallback(async (transcript) => {
    if (!transcript || transcript.trim() === '') {
      console.log('No transcript to process');
      return;
    }

    setIsProcessingAI(true);
    try {
      const response = await fetch(`${API_BASE}/api/ai/format`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript }),
      });

      if (response.ok) {
        const result = await response.json();
        setAiProcessedTranscript(result.formatted);
        setAiEnhancedText(result.enhancedText || '');
        setAiSummaryText(result.summaryText || '');
        setAiThemesText(result.themesText || '');
        setAiServiceUsed(result.service || '');
        if (!editedAiText) setEditedAiText(result.enhancedText || '');
        console.log('AI processing successful:', result);
      } else {
        console.error('AI processing failed:', response.status);
        setAiProcessedTranscript('AI processing failed. Please try again.');
      }
    } catch (error) {
      console.error('Error processing transcript with AI:', error);
      setAiProcessedTranscript('Error connecting to AI service.');
    } finally {
      setIsProcessingAI(false);
    }
  }, []);

  // Auto-process transcript with AI when it changes
  useEffect(() => {
    if (finalTranscript && finalTranscript.trim() !== '') {
      // Debounce AI processing to avoid too many requests
      const timeoutId = setTimeout(() => {
        processTranscriptWithAI(finalTranscript);
      }, 2000); // Wait 2 seconds after transcript stops changing

      return () => clearTimeout(timeoutId);
    }
  }, [finalTranscript, processTranscriptWithAI]);

  // Auto-generate WE when switching to WE tab or after submission
  useEffect(() => {
    if (activeTab === 'we') {
      generateWE();
    }
  }, [activeTab]);

  const switchTab = (tabName) => {
    // Don't allow tab switching on orientation page
    if (currentPage === 'videoconference') {
      return;
    }
    setActiveTab(tabName);
  };

  const isConnected = transcriptionStatus === 'Connected' || isRecording;

  // Map pages to their corresponding substages
  const getSubstageFromPage = (page) => {
    const substageMapping = {
      // ORIENTATION stage (Page 4) - no active tab
      'videoconference': null, // No active tab for orientation
      
      // CONNECT stage
      'connect-dyad': 'catalyst',
      'dyad-dialogue-connect': 'dialogue', 
      'dyad-summary-review': 'summary',
      'connect-dyad-collective-wisdom': 'we',
      
      // EXPLORE stage
      'explore-catalyst': 'catalyst',
      'explore-triad-dialogue': 'dialogue',
      'explore-triad-summary': 'summary', 
      'explore-collective-wisdom': 'we',
      
      // DISCOVER stage
      'discover-fishbowl-catalyst': 'catalyst',
      'discover-kiva-dialogue': 'dialogue',
      'discover-kiva-summary': 'summary',
      'discover-collective-wisdom': 'we',
      
      // HARVEST stage
      'harvest': 'we', // Community gathering - WE tab active
      'reflection': 'we', // Individual reflection
      'summary': 'we', // AI summaries
      'we-summary': 'we',
      'new-insights': 'we',
      'questions': 'we',
      'talkabout': 'we',
      'cantalk': 'we',
      'emergingstory': 'we',
      'ourstory': 'we',
      'buildingcommunity': 'we'
    };
    
    // Only return null for orientation page, otherwise default to 'dialogue'
    if (page === 'videoconference') {
      return null;
    }
    return substageMapping[page] || 'dialogue';
  };

  // Update active tab when currentPage changes
  useEffect(() => {
    if (currentPage) {
      const substage = getSubstageFromPage(currentPage);
      console.log('Current page:', currentPage, 'Active tab:', substage); // Debug log
      setActiveTab(substage); // This will be null for orientation page
    }
  }, [currentPage]);

  // Initialize session and breakout identifiers (simple, local-first)
  useEffect(() => {
    let sid = localStorage.getItem('gd_session_id');
    if (!sid) {
      sid = `dev-session-${Date.now()}`;
      localStorage.setItem('gd_session_id', sid);
    }
    setSessionId(sid);
    // Basic breakout id; can be replaced by real routing context later
    let bid = localStorage.getItem('gd_breakout_id');
    if (!bid) {
      bid = 'breakout-1';
      localStorage.setItem('gd_breakout_id', bid);
    }
    setBreakoutId(bid);
  }, []);

  // Reflect external vote tallies from footer when provided
  useEffect(() => {
    if (externalTallies && typeof externalTallies.total === 'number') {
      setVoteTallies(externalTallies);
    }
  }, [externalTallies]);

  // Removed explicit reprocess button; reprocessing happens automatically when needed

  const submitEditsToGroup = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sessionId)}/breakout/${encodeURIComponent(breakoutId)}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalTranscript || null,
          enhancedText: aiEnhancedText || null,
          summaryText: aiSummaryText || null,
          themesText: aiThemesText || null,
          quotes: []
        })
      });
      if (res.ok) {
        const data = await res.json();
        console.log('Submitted to group:', data);
      } else {
        console.error('Submit failed with status', res.status);
      }
    } catch (err) {
      console.error('Submit error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Voting handled in footer; tally still shown when available

  const [weMeta, setWeMeta] = useState(null);
  const generateWE = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sessionId)}/aggregate`);
      if (res.ok) {
        const data = await res.json();
        setWeMeta(data.meta || null);
      }
    } catch (err) {
      console.error('WE aggregate error:', err);
    }
  };

  return (
    <div className="bottom-content-area">
      <div className="tab-area">
        <div className="tab-navigation">
          <div className="tab-controls-left">
            <div 
              className={`tab-btn ${activeTab === 'catalyst' ? 'active' : ''}`}
              onClick={() => switchTab('catalyst')}
              title="Catalyst - instructions and activities to help catalyze an effective dialogue."
            >
              Catalyst
            </div>
            <div 
              className={`tab-btn ${activeTab === 'dialogue' ? 'active' : ''}`}
              onClick={() => switchTab('dialogue')}
              title="Dialogue - Live transcription and conversation content"
            >
              Dialogue
            </div>
            <div 
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => switchTab('summary')}
              title="Summary - AI-generated insights and voting"
            >
              Summary
            </div>
            <div 
              className={`tab-btn ${activeTab === 'we' ? 'active' : ''}`}
              onClick={() => switchTab('we')}
              title="WE - Collective wisdom and voices from the field"
            >
              WE
            </div>
          </div>
          
          <div className="tab-controls-right" />
        </div>
        
        <div className="tab-content">
          {activeTab === 'catalyst' && (
            <div style={{ padding: '1rem', color: 'black' }}>
              <h3 className="tab-section-title">Catalyst</h3>
              <p>Instructions and activities to help catalyze an effective dialogue.</p>
            </div>
          )}
          {activeTab === 'dialogue' && (
            <div className="dialogue-content">
              <div className="dialogue-section">
                <h4 className="tab-section-title">
                  Live Stream {isConnected ? <span className="status-dot on" /> : <span className="status-dot off" />}<span style={{fontWeight:500,color:'#3E4C71'}}>{isConnected ? 'LIVE' : 'OFF'}</span>
                  <span className="inline-controls">
                    <button className="inline-btn" onClick={isConnected ? stopRecording : startRecording} title={isConnected ? 'Stop' : 'Start'}>
                      {isConnected ? 'Stop' : 'Start'}
                    </button>
                    <button className="inline-btn" onClick={clearTranscription} title="Clear (dev only)">Clear</button>
                  </span>
                </h4>
                <div className="ai-hint">Transcribed by Deepgram</div>
                <div className="live-transcript">
                  {lastThreeLines || 'No live transcription yet. Click "Start" to begin.'}
                </div>
              </div>
              
              <div className="dialogue-section">
                <h4 className="tab-section-title">
                  AI Processed Transcript
                  <span className="inline-controls">
                    <button className="inline-btn" onClick={() => { setEditedAiText(aiEnhancedText); setIsEditingAI(true); }}>Optional Edit</button>
                  </span>
                </h4>
                <div className="ai-hint">Enhanced by {aiServiceUsed ? aiServiceUsed.charAt(0).toUpperCase() + aiServiceUsed.slice(1) : 'AI Service'}</div>
                <div className="ai-transcript">
                  {isProcessingAI ? (
                    <p>🔄 Processing transcript with AI...</p>
                  ) : (
                    <>
                      {isEditingAI ? (
                        <div>
                          <textarea
                            style={{ width: '100%', minHeight: '120px' }}
                            value={editedAiText}
                            onChange={(e) => setEditedAiText(e.target.value)}
                          />
                          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                            <button className="transcription-control-btn primary" onClick={() => { setAiEnhancedText(editedAiText); setIsEditingAI(false); }}>Save</button>
                            <button className="transcription-control-btn" onClick={() => setIsEditingAI(false)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div dangerouslySetInnerHTML={{ __html: enhancedHtml }} />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'summary' && (
            <div style={{ padding: '1rem', color: 'black', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <h4 className="tab-section-title">
                  Highlights (Concise)
                  <span className="inline-controls">
                    {isEditingSummary ? (
                      <>
                        <button className="inline-btn" onClick={() => setIsEditingSummary(false)}>Done</button>
                      </>
                    ) : (
                      <button className="inline-btn" onClick={() => setIsEditingSummary(true)}>Edit</button>
                    )}
                  </span>
                </h4>
                <div className="ai-hint">Generated by Grok (xAI)</div>
                {isEditingSummary ? (
                  <textarea
                    style={{ width: '100%', minHeight: '120px', fontFamily: 'inherit', border: '1px solid #e9ecef', borderRadius: 6, padding: 8 }}
                    value={aiSummaryText}
                    onChange={(e) => setAiSummaryText(e.target.value)}
                  />
                ) : (
                  <div className="ai-transcript" style={{ marginTop: '6px' }}>
                    <div dangerouslySetInnerHTML={{ __html: summaryHtml }} />
                  </div>
                )}
              </div>
              <div>
                <h4 className="tab-section-title">
                  Top Themes
                  <span className="inline-controls">
                    {isEditingThemes ? (
                      <button className="inline-btn" onClick={() => setIsEditingThemes(false)}>Done</button>
                    ) : (
                      <button className="inline-btn" onClick={() => setIsEditingThemes(true)}>Edit</button>
                    )}
                  </span>
                </h4>
                <div className="ai-hint">Extracted by Grok (xAI)</div>
                {isEditingThemes ? (
                  <textarea
                    style={{ width: '100%', minHeight: '140px', fontFamily: 'inherit', border: '1px solid #e9ecef', borderRadius: 6, padding: 8 }}
                    value={aiThemesText}
                    onChange={(e) => setAiThemesText(e.target.value)}
                  />
                ) : (
                  <div className="ai-transcript" style={{ marginTop: '6px' }}>
                    <div dangerouslySetInnerHTML={{ __html: themesHtml }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button className="transcription-control-btn primary" onClick={submitEditsToGroup} disabled={isSubmitting}>{isSubmitting ? 'Submitting…' : 'Submit to Group'}</button>
                <span style={{ color: '#3E4C71' }}>Cast your vote in the footer</span>
                <span className="transcription-status" style={{ background: 'transparent', color: '#3E4C71', minWidth: 180 }}>
                  {`Votes: +${voteTallies.up} / -${voteTallies.down} (Total: ${voteTallies.total})`}
                </span>
              </div>
            </div>
          )}
          {activeTab === 'we' && (
            <div style={{ padding: '1rem', color: 'black', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {weMeta && (
                <div className="we-panel" style={{ background: 'white' }}>
                  <h4 className="tab-section-title">Meta Narrative</h4>
                  <div className="ai-hint">Aggregated server‑side; narrative derived from Grok (xAI)</div>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(weMeta.narrative || '') }} />
                  <h4 className="tab-section-title" style={{ marginTop: '12px' }}>Meta Themes</h4>
                  <div className="ai-hint">Aggregated server‑side; themes derived from Grok (xAI)</div>
                  <div dangerouslySetInnerHTML={{ __html: renderMarkdown(weMeta.themesText || '') }} />
                  {Array.isArray(weMeta.quotes) && weMeta.quotes.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <h4 className="tab-section-title">Voices from the Field</h4>
                      <ul>
                        {weMeta.quotes.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {weMeta.votes && (
                    <div style={{ marginTop: '12px', color: '#3E4C71' }}>
                      {`Votes Tally: +${weMeta.votes.up} / -${weMeta.votes.down} (Total: ${weMeta.votes.total})`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BottomContentArea;
