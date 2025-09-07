import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import './BottomContentArea.css';
import JourneyInsights from './JourneyInsights';

const BottomContentArea = ({ currentPage, voteTallies: externalTallies, isHost = false, isVotingOpen = true }) => {
  const [activeTab, setActiveTab] = useState(null); // Start with no active tab
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('Disconnected');
  const [finalTranscript, setFinalTranscript] = useState('');
  // Note: no separate processed transcript field; we render enhanced/summary/themes directly
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
  const [weMeta, setWeMeta] = useState(null);
  const [submissionToast, setSubmissionToast] = useState(null);
  const [isReceivingRemoteTranscript, setIsReceivingRemoteTranscript] = useState(false);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (submissionToast) {
      const timer = setTimeout(() => {
        setSubmissionToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submissionToast]);

  // Auto-record contributions for growth tracking
  const recordContributionForGrowth = useCallback(async (content, type = 'transcript') => {
    const participantId = localStorage.getItem('gd_participant_id');
    if (!participantId || !sessionId || !content || content.length < 10) return;
    
    try {
      await fetch(`/api/participants/${participantId}/contribution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: content.trim(),
          type
        })
      });
    } catch (error) {
      console.error('Error recording contribution:', error);
    }
  }, [sessionId]);

  const [isConnecting, setIsConnecting] = useState(false);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);

  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const connectionLockRef = useRef(false);
  const CONNECTION_DEBOUNCE_MS = 2000;
  // Same-origin API base; dev server proxies to backend (see setupProxy.js)
  const WS_PROTO = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const API_BASE = '';

  // Dev helper: create a session/breakout if none present
  const ensureIds = useCallback(async () => {
    let sid = localStorage.getItem('gd_session_id');
    let bid = localStorage.getItem('gd_breakout_id');
    try {
      if (!sid) {
        const r = await fetch(`${API_BASE}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Dev Session' }) });
        if (r.ok) { const j = await r.json(); sid = j.sessionId; localStorage.setItem('gd_session_id', sid); }
      }
      if (!bid && sid) {
        const r2 = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sid)}/breakout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Dev Breakout', size: 6 }) });
        if (r2.ok) { const j2 = await r2.json(); bid = j2.breakoutId; localStorage.setItem('gd_breakout_id', bid); }
      }
    } catch (_) { /* ignore */ }
    if (sid) setSessionId(sid);
    if (bid) setBreakoutId(bid);
  }, [API_BASE]);

  useEffect(() => { ensureIds(); }, [ensureIds]);

  // Dev helper: always create a fresh session/breakout and set ids
  const createNewSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Dev Session' }),
      });
      if (!res.ok) throw new Error('Failed to create session');
      const { sessionId: newSessionId } = await res.json();
      const res2 = await fetch(`${API_BASE}/api/session/${encodeURIComponent(newSessionId)}/breakout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dev Breakout', size: 6 }),
      });
      if (!res2.ok) throw new Error('Failed to create breakout');
      const { breakoutId: newBreakoutId } = await res2.json();
      localStorage.setItem('gd_session_id', newSessionId);
      localStorage.setItem('gd_breakout_id', newBreakoutId);
      setSessionId(newSessionId);
      setBreakoutId(newBreakoutId);
    } catch (err) {
      console.error('Create session error:', err);
    }
  }, [API_BASE]);
  
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

        wsRef.current = new WebSocket(`${WS_PROTO}://${window.location.host}/realtime`);

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
            
            // Record contribution for growth tracking
            recordContributionForGrowth(data.transcript, 'transcript');
            
            // Also broadcast to participants via session bus when host
            try {
              if (isHost) {
                const busEvt = { type: 'transcript', text: data.transcript, isFinal: true };
                // Send over session-bus via window bus if available (handled in App.js)
                window.dispatchEvent(new CustomEvent('gd-local-transcript', { detail: busEvt }));
              }
            } catch (e) { /* ignore */ }
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
  }, [isConnecting, lastConnectionAttempt, stopRealTimeTranscription, WS_PROTO]);
  
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
    // reset derived fields
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

  // Simple fallback theme extractor when AI themes are unavailable/time out
  const buildFallbackThemes = useCallback((text) => {
    if (!text || typeof text !== 'string') return '';
    const stop = new Set(['the','and','for','that','with','this','from','have','will','about','your','into','their','there','then','than','they','them','you','are','was','were','been','what','when','where','which','who','how','why','can','could','should','would','just','like','well','really','very','only','also','into','onto','onto','over','under','between','among','because','but','not','dont','didnt','cant','wont','its','its']);
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w && w.length > 3 && !stop.has(w));
    const freq = new Map();
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
    const top = Array.from(freq.entries()).sort((a,b) => b[1]-a[1]).slice(0,5).map(([w]) => w);
    if (top.length === 0) return '';
    return top.map(w => `- ${w.charAt(0).toUpperCase()}${w.slice(1)}`).join('\n');
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
        const enhanced = result.enhancedText || '';
        const summary = result.summaryText || '';
        let themes = result.themesText || '';
        if (!themes || themes.trim().length === 0) {
          // Build a lightweight fallback so Themes always shows something
          themes = buildFallbackThemes(enhanced || transcript) || '';
        }
        setAiEnhancedText(enhanced);
        setAiSummaryText(summary);
        setAiThemesText(themes);
        setAiServiceUsed(result.service || '');
        if (!editedAiText) setEditedAiText(enhanced);
        console.log('AI processing successful:', result);
        // Broadcast AI results to participants via session bus (App.js forwards these)
        try {
          if (isHost) {
            window.dispatchEvent(new CustomEvent('gd-local-ai', { detail: {
              enhancedText: enhanced,
              summaryText: summary,
              themesText: themes,
              service: result.service || ''
            }}));
          }
        } catch (_) { /* ignore */ }
      } else {
        console.error('AI processing failed:', response.status);
      }
    } catch (error) {
      console.error('Error processing transcript with AI:', error);
    } finally {
      setIsProcessingAI(false);
    }
  }, []);

  // Auto-process transcript with AI when it changes (host-only to reduce load)
  useEffect(() => {
    if (!isHost) return; // only host triggers AI processing
    if (finalTranscript && finalTranscript.trim() !== '') {
      // Debounce AI processing to avoid too many requests
      const timeoutId = setTimeout(() => {
        processTranscriptWithAI(finalTranscript);
      }, 3500); // Wait 3.5s after transcript stops changing

      return () => clearTimeout(timeoutId);
    }
  }, [finalTranscript, processTranscriptWithAI, isHost]);

  // Listen for host-broadcast transcript lines and append on participants
  useEffect(() => {
    const handler = (e) => {
      const { text, isFinal } = e.detail || {};
      if (!text) return;
      setFinalTranscript(prev => `${prev}\n${text}`);
      
      // Track that we're receiving remote transcript (for Live Stream indicator)
      setIsReceivingRemoteTranscript(true);
      
      // Reset the receiving state after 5 seconds of no activity
      clearTimeout(window.remoteTranscriptTimeout);
      window.remoteTranscriptTimeout = setTimeout(() => {
        setIsReceivingRemoteTranscript(false);
      }, 5000);
    };
    window.addEventListener('gd-remote-transcript', handler);
    return () => {
      window.removeEventListener('gd-remote-transcript', handler);
      clearTimeout(window.remoteTranscriptTimeout);
    };
  }, []);

  // Listen for host-broadcast AI outputs so participants mirror enhanced/summary/themes
  useEffect(() => {
    const handler = (e) => {
      const { enhancedText, summaryText, themesText, service } = e.detail || {};
      setAiEnhancedText(enhancedText || '');
      setAiSummaryText(summaryText || '');
      setAiThemesText(themesText || '');
      setAiServiceUsed(service || '');
      if (!editedAiText) setEditedAiText(enhancedText || '');
    };
    window.addEventListener('gd-remote-ai', handler);
    return () => window.removeEventListener('gd-remote-ai', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aggregate WE helper, memoized
  const generateWE = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sessionId)}/aggregate`);
      if (res.ok) {
        const data = await res.json();
        setWeMeta(data.meta || null);
      }
    } catch (err) {
      console.error('WE aggregate error:', err);
    }
  }, [sessionId]);

  // Auto-generate WE when switching to WE tab or after submission
  useEffect(() => {
    if (activeTab === 'we') {
      generateWE();
    }
  }, [activeTab, generateWE]);

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

  // Reflect external vote tallies from footer and show a brief toast when vote registers
  const prevTalliesRef = useRef({ up: 0, down: 0, total: 0 });
  const talliesInitializedRef = useRef(false);
  useEffect(() => {
    if (externalTallies && typeof externalTallies.total === 'number') {
      const prev = prevTalliesRef.current;
      const changed = prev.up !== externalTallies.up || prev.down !== externalTallies.down || prev.total !== externalTallies.total;
      setVoteTallies(externalTallies);
      if (talliesInitializedRef.current && changed) {
        setSubmissionToast({ type: 'success', message: 'Vote recorded.' });
      }
      prevTalliesRef.current = externalTallies;
      if (!talliesInitializedRef.current) talliesInitializedRef.current = true;
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
        // notify user success
        setSubmissionToast({ type: 'success', message: 'Submitted to group.' });
        // auto-open WE and refresh aggregate
        setActiveTab('we');
        setTimeout(() => generateWE(), 50);
      } else {
        console.error('Submit failed with status', res.status);
        setSubmissionToast({ type: 'error', message: `Submit failed (${res.status}).` });
      }
    } catch (err) {
      console.error('Submit error:', err);
      setSubmissionToast({ type: 'error', message: 'Network error submitting.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Voting handled in footer; tally still shown when available

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
          
          {/* Journey tab separated as it has different functionality */}
          <div className="tab-controls-center">
            <div 
              className={`tab-btn journey-tab ${activeTab === 'journey' ? 'active' : ''}`}
              onClick={() => switchTab('journey')}
              title="Journey - Your personal growth and insights"
            >
              Journey
            </div>
          </div>
          
          <div className="tab-controls-right" />
        </div>
        
        <div className="tab-content">
          {submissionToast && (
            <div style={{ position: 'absolute', top: 8, right: 12, background: submissionToast.type === 'success' ? '#2e7d32' : '#b00020', color: 'white', padding: '8px 12px', borderRadius: 6, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', zIndex: 20, pointerEvents: 'none' }}>
              {submissionToast.message}
            </div>
          )}
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
                  Live Stream {(isConnected || (!isHost && isReceivingRemoteTranscript)) ? <span className="status-dot on" /> : <span className="status-dot off" />}<span style={{fontWeight:500,color:'#3E4C71'}}>{(isConnected || (!isHost && isReceivingRemoteTranscript)) ? 'LIVE' : 'OFF'}</span>
                  {isHost && (
                    <span className="inline-controls">
                      <button className="inline-btn" onClick={isConnected ? stopRecording : startRecording} title={isConnected ? 'Stop' : 'Start'}>
                        {isConnected ? 'Stop' : 'Start'}
                      </button>
                      <button className="inline-btn" onClick={clearTranscription} title="Clear (dev only)">Clear</button>
                      <button className="inline-btn" onClick={createNewSession} title="Create new Session & Breakout (dev only)">New Session</button>
                      <button
                        className="inline-btn"
                        title="Copy invite link"
                        onClick={() => {
                          if (!sessionId || !breakoutId) return;
                          // If running on localhost, replace host with LAN IP/hostname so phones can reach it
                          const url = `${window.location.origin}/?sessionId=${encodeURIComponent(sessionId)}&breakoutId=${encodeURIComponent(breakoutId)}&role=participant`;
                          navigator.clipboard.writeText(url).then(() => {
                            setSubmissionToast({ type: 'success', message: 'Invite link copied.' });
                          }).catch(() => {
                            setSubmissionToast({ type: 'error', message: 'Could not copy link.' });
                          });
                        }}
                      >Copy Invite</button>
                    </span>
                  )}
                </h4>
                <div className="ai-hint">Transcribed by Deepgram</div>
                {(sessionId || breakoutId) && (
                  <div className="ai-hint">Session: {sessionId ? `${sessionId.substring(0, 8)}…` : '—'} • Breakout: {breakoutId ? `${breakoutId.substring(0, 8)}…` : '—'}</div>
                )}
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
                      <button className="inline-btn" onClick={() => setIsEditingSummary(true)}>Optional Edit</button>
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
                      <button className="inline-btn" onClick={() => setIsEditingThemes(true)}>Optional Edit</button>
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
          {activeTab === 'journey' && (
            <div style={{ padding: '1rem', color: 'black' }}>
              <JourneyInsights 
                participantId={localStorage.getItem('gd_participant_id')}
                sessionId={sessionId}
              />
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
