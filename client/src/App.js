import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { buildWsUrl } from './config/api';
import './App.css';

// Import room management components and config
import RoomAssignmentManager from './components/RoomAssignmentManager';
import { ROOM_TYPES } from './config/roomConfig';

// Import components
import GenerativeDialogue from './components/GenerativeDialogue';
import ConnectDyadPage from './components/ConnectDyadPage';
import DyadDialoguePageConnect from './components/DyadDialoguePageConnect';
import DyadSummaryReviewPage from './components/DyadSummaryReviewPage';
import ConnectDyadCollectiveWisdomPage from './components/ConnectDyadCollectiveWisdomPage';
import ExploreCatalystPage from './components/ExploreCatalystPage';
import ExploreTriadDialoguePage from './components/ExploreTriadDialoguePage';
import ExploreTriadSummaryPage from './components/ExploreTriadSummaryPage';
import ExploreCollectiveWisdomPage from './components/ExploreCollectiveWisdomPage';
import DiscoverFishbowlCatalystPage from './components/DiscoverFishbowlCatalystPage';
import DiscoverKivaDialoguePage from './components/DiscoverKivaDialoguePage';
import DiscoverKivaSummaryPage from './components/DiscoverKivaSummaryPage';
import DiscoverCollectiveWisdomPage from './components/DiscoverCollectiveWisdomPage';
import HarvestPage from './components/HarvestPage';
import LandingPage from './components/LandingPage';
import PermissionSetup from './components/PermissionSetup';
import InputPage from './components/InputPage';
import IndividualReflectionPage from './components/IndividualReflectionPage';
import AISummaryPage from './components/AISummaryPage';
import HarvestOutroPage from './components/HarvestOutroPage';
import SummaryPage from './components/SummaryPage';
import WESummaryPage from './components/WESummaryPage';
import NewInsightsPage from './components/NewInsightsPage';
import QuestionsPage from './components/QuestionsPage';
import TalkAboutPage from './components/TalkAboutPage';
import CanTalkPage from './components/CanTalkPage';
import EmergingStoryPage from './components/EmergingStoryPage';
import OurStoryPage from './components/OurStoryPage';
import BuildingCommunityPage from './components/BuildingCommunityPage';
import ParticipantSignIn from './components/ParticipantSignIn';
import ParticipantJoin from './components/ParticipantJoin';
import SessionJoin from './components/SessionJoin';
import SessionLobby from './components/SessionLobby';
import SimpleDashboard from './components/SimpleDashboard';
import EnhancedVideoSession from './components/EnhancedVideoSession';
import { VideoProvider, useVideo } from './components/VideoProvider';
import ErrorBoundary from './components/ErrorBoundary';
import { initializeErrorSuppression } from './utils/errorSuppression';
import AppLayout from './components/AppLayout';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

function AppContent() {
  const { realParticipants } = useVideo();
  const [currentPage, setCurrentPage] = useState('landing');
  const [isHost, setIsHost] = useState(false);
  const [voteState, setVoteState] = useState(null);
  const [voteTallies, setVoteTallies] = useState({ up: 0, down: 0, total: 0 });
  const [isVotingOpen, setIsVotingOpen] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [breakoutId, setBreakoutId] = useState(null);
  const [bus, setBus] = useState(null);
  const [participantName, setParticipantName] = useState('');
  const [participantData, setParticipantData] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isInCall, setIsInCall] = useState(true);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [segmentTime, setSegmentTime] = useState(300); // 5-minute segment countdown
  const [activeSize, setActiveSize] = useState('all'); // Add state for left navigation

  // Parse URL parameters and path to set the current page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const roleParam = urlParams.get('role');
    const sidParam = urlParams.get('sessionId');
    const sessionParam = urlParams.get('session'); // Handle ?session=ABC123 format
    const bidParam = urlParams.get('breakoutId');
    const nameParam = urlParams.get('name');
    
    // Debug logging
    console.log('App routing debug:', {
      pathname: window.location.pathname,
      search: window.location.search,
      pageParam,
      sessionParam,
      currentPage
    });
    
    // Handle session join URL (e.g., ?session=ABC123)
    // But only if no explicit page parameter is set
    if (sessionParam && !pageParam) {
      console.log('🔗 Session URL detected:', sessionParam);
      setSessionId(sessionParam);
      // Navigate to participant join page first (to collect name)
      console.log('🔄 Navigating to participant-join page');
      setCurrentPage('participant-join');
      return; // Exit early to avoid other routing logic
    } else if (sessionParam && pageParam) {
      // Both session and page parameters - set session but let page parameter handle routing
      console.log('🔗 Session URL with explicit page detected:', sessionParam, pageParam);
      setSessionId(sessionParam);
      // Continue to page parameter handling below
    }
    
    // CRITICAL FIX: Handle session-join page explicitly
    if (pageParam === 'session-join') {
      console.log('🎯 Explicit session-join page requested');
      setCurrentPage('session-join');
      return; // Exit early to ensure session-join page is shown
    }
    
    // Check URL path for direct routing (e.g., /dashboard, /signin)
    const path = window.location.pathname;
    if (path === '/dashboard') {
      console.log('Setting page to dashboard (path)');
      setCurrentPage('dashboard');
    } else if (path === '/signin') {
      console.log('Setting page to signin (path)');
      setCurrentPage('signin');
    } else if (pageParam) {
      console.log('Setting page to:', pageParam);
      setCurrentPage(pageParam);
    } else if (path === '/' || path === '') {
      // Default to landing page for root path
      console.log('Setting page to landing (default)');
      setCurrentPage('landing');
    }
    setIsHost(roleParam === 'host');

    // If join params exist, persist them and set immediately for cross-device join
    if (sidParam) {
      console.log('🔍 App.js: Setting sessionId from sidParam:', sidParam);
      localStorage.setItem('gd_session_id', sidParam);
      setSessionId(sidParam);
    }
    if (bidParam) {
      localStorage.setItem('gd_breakout_id', bidParam);
      setBreakoutId(bidParam);
    }
    const storedName = nameParam || sessionStorage.getItem('gd_current_participant_name') || '';
    if (storedName) {
      // Persist URL-provided name to sessionStorage so join logic uses it
      try { sessionStorage.setItem('gd_current_participant_name', storedName); } catch (_) {}
      setParticipantName(storedName);
      // Check if we have full participant data
      const storedParticipantId = localStorage.getItem('gd_participant_id');
      if (storedParticipantId) {
        setParticipantData({
          id: storedParticipantId,
          name: storedName,
          email: localStorage.getItem('gd_participant_email') || '',
          organization: localStorage.getItem('gd_participant_org') || ''
        });
        setIsSignedIn(true);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTotalTime(prevTime => prevTime + 1);
      setSegmentTime(prevTime => (prevTime > 0 ? prevTime - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleVote = useCallback((direction) => {
    setVoteState(voteState === direction ? null : direction);
  }, [voteState]);
  
  const handleToggleMic = useCallback(() => setIsMuted(prev => !prev), []);
  const handleToggleCamera = useCallback(() => setIsCameraOff(prev => !prev), []);
  const handleToggleCall = useCallback(() => setIsInCall(prev => !prev), []);
  const handleToggleLoop = useCallback(() => setIsLoopActive(prev => !prev), []);
  const handleSizeChange = useCallback((newSize) => setActiveSize(newSize), []); // Add handler for left navigation

  const handleParticipantSignIn = async (participantData) => {
    try {
      // Register participant with backend
      const API_BASE = '';
      const response = await fetch(`${API_BASE}/api/participants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(participantData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to register participant');
      }
      
      const result = await response.json();
      console.log('👤 Participant registered successfully:', result);
      
      // Store participant ID for future use
      localStorage.setItem('gd_participant_id', participantData.id);
      
      // Update state
      setParticipantData(participantData);
      setParticipantName(participantData.name);
      setIsSignedIn(true);
      
      // Continue to input page
      setCurrentPage('input');
      
    } catch (error) {
      console.error('❌ Participant sign-in error:', error);
      // Could show error toast here
      throw error;
    }
  };

  const handleContinueToInput = () => {
    if (isSignedIn) {
      setCurrentPage('input');
    } else {
      // Show sign-in form
      setCurrentPage('signin');
    }
  };

  // Helper function to navigate to dashboard
  const navigateToDashboard = () => {
    window.history.pushState({}, '', '/dashboard');
    setCurrentPage('dashboard');
  };

  const handleInputComplete = () => {
    setCurrentPage('permissions');
  };

  const handleSetupComplete = () => {
    sessionStorage.setItem('setupComplete', 'true');
    setCurrentPage('videoconference');
  };

  // Ensure real session/breakout IDs exist early for footer voting
  useEffect(() => {
    // Same-origin; dev proxy will forward to backend
    const API_BASE = '';
    let sid = localStorage.getItem('gd_session_id');
    let bid = localStorage.getItem('gd_breakout_id');
    
    // Get sessionParam from URL in this scope
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    console.log('🔍 App.js: Auto-creation loaded from localStorage:', { sid, bid, sessionParam });
    const ensure = async () => {
      try {
        if (!sid) {
          const r = await fetch(`${API_BASE}/api/session`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'Dev Session' }) });
          if (r.ok) { const j = await r.json(); sid = j.sessionId; localStorage.setItem('gd_session_id', sid); }
        }
        if (!bid && sid) {
          const r2 = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sid)}/breakout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Dev Breakout', size: 6 }) });
          if (r2.ok) { const j2 = await r2.json(); bid = j2.breakoutId; localStorage.setItem('gd_breakout_id', bid); }
        }
      } catch (_) { /* no-op */ }
      if (sid) {
        console.log('🔍 App.js: Auto-creation setting sessionId to:', sid);
        setSessionId(sid);
      }
      if (bid) setBreakoutId(bid);
    };
    // CRITICAL: If URL has sessionParam, use that instead of localStorage
    if (sessionParam) {
      console.log('🎯 App.js: URL sessionParam takes priority over localStorage:', sessionParam);
      setSessionId(sessionParam);
      // Don't run auto-creation when we have a URL session parameter
    } else {
      // If params provided were already set above, skip auto-create
      if (!sid || !bid) {
        ensure();
      } else {
        setSessionId(sid);
        setBreakoutId(bid);
      }
    }
  }, []);

  // Session bus: real-time host → participants updates
  useEffect(() => {
    if (!sessionId) return;
    
    try {
      const wsUrl = buildWsUrl('session-bus');
      console.log('🔌 Connecting to session-bus:', wsUrl);
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('🔄 Session-bus connected, joining session:', sessionId);
        ws.send(JSON.stringify({ type: 'join', sessionId, breakoutId: breakoutId || null, role: isHost ? 'host' : 'participant' }));
      };
      ws.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data);
          if (msg.type === 'stage' && msg.page) {
            setCurrentPage(msg.page);
          } else if (msg.type === 'voting' && typeof msg.open === 'boolean') {
            setIsVotingOpen(msg.open);
          } else if (msg.type === 'transcript' && typeof msg.text === 'string') {
            console.log('📥 Received remote transcript:', msg.text);
            // Bubble up to a simple custom event so BottomContentArea can append
            window.dispatchEvent(new CustomEvent('gd-remote-transcript', { detail: { text: msg.text, isFinal: !!msg.isFinal } }));
          } else if (msg.type === 'ai' && (msg.enhancedText || msg.summaryText || msg.themesText)) {
            console.log('📥 Received remote AI data');
            window.dispatchEvent(new CustomEvent('gd-remote-ai', { detail: {
              enhancedText: msg.enhancedText || '',
              summaryText: msg.summaryText || '',
              themesText: msg.themesText || '',
              service: msg.service || ''
            }}));
          } else if (msg.type === 'voteTallies' && msg.tallies) {
            setVoteTallies(msg.tallies);
          }
        } catch (e) { 
          console.warn('Session-bus message parse error:', e);
        }
      };
      ws.onclose = () => {
        console.log('🔌 Session-bus disconnected');
      };
      ws.onerror = (error) => {
        console.warn('Session-bus error (non-fatal):', error);
      };
      setBus(ws);
      return () => { 
        try { 
          ws.close(); 
        } catch (_) {} 
      };
    } catch (e) { 
      console.warn('Session-bus connection failed (non-fatal):', e);
    }
  }, [sessionId, isHost]);

  const navigateToStage = useCallback((stage) => {
    // Map stage key to first subpage in that stage
    const stageFirstPage = {
      connect: 'connect-dyad',
      explore: 'explore-catalyst',
      discover: 'discover-fishbowl-catalyst',
      harvest: 'harvest',
    };
    const page = stageFirstPage[stage] || 'connect-dyad';
    setCurrentPage(page);
    if (isHost && bus && bus.readyState === WebSocket.OPEN) {
      try { bus.send(JSON.stringify({ type: 'stage', sessionId, page })); } catch (_) {}
    }
  }, [bus, isHost, sessionId]);

  // Forward local transcript lines (from host) to the session bus so participants see Live Stream
  useEffect(() => {
    const handler = (e) => {
      const { text, isFinal } = (e && e.detail) || {};
      if (!text) return;
      if (bus && bus.readyState === WebSocket.OPEN) {
        try { bus.send(JSON.stringify({ type: 'transcript', text, isFinal: !!isFinal })); } catch (_) {}
      }
    };
    window.addEventListener('gd-local-transcript', handler);
    return () => window.removeEventListener('gd-local-transcript', handler);
  }, [bus]);

  // Forward local AI processed payload (host) to session bus
  useEffect(() => {
    const handler = (e) => {
      const { enhancedText, summaryText, themesText, service } = (e && e.detail) || {};
      if (!bus || bus.readyState !== WebSocket.OPEN) return;
      try { bus.send(JSON.stringify({ type: 'ai', enhancedText, summaryText, themesText, service })); } catch (_) {}
    };
    window.addEventListener('gd-local-ai', handler);
    return () => window.removeEventListener('gd-local-ai', handler);
  }, [bus]);

  const pages = ['landing', 'input', 'permissions', 'videoconference', 'connect-dyad', 'dyad-dialogue-connect', 'dyad-summary-review', 'connect-dyad-collective-wisdom', 'explore-catalyst', 'explore-triad-dialogue', 'explore-triad-summary', 'explore-collective-wisdom', 'discover-fishbowl-catalyst', 'discover-kiva-dialogue', 'discover-kiva-summary', 'discover-collective-wisdom', 'harvest', 'reflection', 'ai-summary-1', 'ai-summary-2', 'ai-summary-3', 'ai-summary-4', 'ai-summary-5', 'ai-summary-6', 'ai-summary-7', 'harvest-outro', 'summary', 'we-summary', 'new-insights', 'questions', 'talkabout', 'cantalk', 'emergingstory', 'ourstory', 'buildingcommunity'];
  const currentIndex = pages.indexOf(currentPage);
  
  // Define the dialogue structure with stages and substages
  const dialogueStructure = {
    'setup': {
      name: 'SETUP',
      substages: ['landing', 'input', 'permissions']
    },
    'orientation': {
      name: 'ORIENTATION',
      substages: ['videoconference'] // Page 4 - orientation/gathering
    },
    'connect': {
      name: 'CONNECT',
      substages: ['connect-dyad', 'dyad-dialogue-connect', 'dyad-summary-review', 'connect-dyad-collective-wisdom']
    },
    'explore': {
      name: 'EXPLORE', 
      substages: ['explore-catalyst', 'explore-triad-dialogue', 'explore-triad-summary', 'explore-collective-wisdom']
    },
    'discover': {
      name: 'DISCOVER',
      substages: ['discover-fishbowl-catalyst', 'discover-kiva-dialogue', 'discover-kiva-summary', 'discover-collective-wisdom']
    },
    'harvest': {
      name: 'HARVEST',
      substages: ['harvest', 'reflection', 'summary', 'we-summary', 'new-insights', 'questions', 'talkabout', 'cantalk', 'emergingstory', 'ourstory', 'buildingcommunity']
    },
    'ai-summary': {
      name: 'AI SUMMARY',
      substages: ['ai-summary-1', 'ai-summary-2', 'ai-summary-3', 'ai-summary-4', 'ai-summary-5', 'ai-summary-6', 'ai-summary-7', 'harvest-outro']
    }
  };

  // Helper function to get current stage and substage
  const getCurrentStageAndSubstage = () => {
    for (const [stageKey, stage] of Object.entries(dialogueStructure)) {
      const substageIndex = stage.substages.indexOf(currentPage);
      if (substageIndex !== -1) {
        return { stageKey, substageIndex, totalSubstages: stage.substages.length };
      }
    }
    return null;
  };

  // Navigate within stages and handle transitions between stages
  const navigateWithinStage = (direction) => {
    console.log('navigateWithinStage called:', { 
      direction, 
      currentPage,
      currentStageInfo: currentStageInfo ? {
        stageKey: currentStageInfo.stageKey,
        substageIndex: currentStageInfo.substageIndex,
        totalSubstages: currentStageInfo.totalSubstages
      } : null
    });
    
    if (!currentStageInfo) {
      // Fallback to sequential navigation for non-dialogue pages
      if (direction === 'forward' && currentIndex < pages.length - 1) {
        setCurrentPage(pages[currentIndex + 1]);
      } else if (direction === 'backward' && currentIndex > 0) {
        setCurrentPage(pages[currentIndex - 1]);
      }
      return;
    }
    
    const { stageKey, substageIndex } = currentStageInfo;
    const stageInfo = dialogueStructure[stageKey];
    
    if (!stageInfo) {
      // Fallback to sequential navigation if stage not found
      if (direction === 'forward' && currentIndex < pages.length - 1) {
        setCurrentPage(pages[currentIndex + 1]);
      } else if (direction === 'backward' && currentIndex > 0) {
        setCurrentPage(pages[currentIndex - 1]);
      }
      return;
    }
    
    if (direction === 'backward') {
      if (substageIndex > 0) {
        // Move to previous substage within current stage
        const newSubstage = stageInfo.substages[substageIndex - 1];
        setCurrentPage(newSubstage);
      } else {
        // Transition to previous stage
        if (stageKey === 'setup') {
          // From setup, go back to landing (but landing is the first page, so stay there)
          if (currentPage === 'landing') {
            // Already at landing, can't go back further
            return;
          } else {
            setCurrentPage('landing');
          }
        } else if (stageKey === 'orientation') {
          // From orientation, go back to permissions (page 3)
          setCurrentPage('permissions');
        } else if (stageKey === 'connect') {
          // From connect, go to orientation
          setCurrentPage('videoconference');
        } else if (stageKey === 'explore') {
          // From explore, go to last substage of connect
          setCurrentPage('connect-dyad-collective-wisdom');
        } else if (stageKey === 'discover') {
          // From discover, go to last substage of explore
          setCurrentPage('explore-collective-wisdom');
        } else if (stageKey === 'harvest') {
          // From harvest, go to last substage of discover
          setCurrentPage('discover-collective-wisdom');
        } else if (stageKey === 'ai-summary') {
          // From AI summary, go back to harvest
          setCurrentPage('harvest');
        }
      }
    } else if (direction === 'forward') {
      if (substageIndex < stageInfo.substages.length - 1) {
        // Move to next substage within current stage
        const newSubstage = stageInfo.substages[substageIndex + 1];
        setCurrentPage(newSubstage);
      } else {
        // Transition to next stage
        if (stageKey === 'setup') {
          // From setup, go to orientation
          setCurrentPage('videoconference');
        } else if (stageKey === 'orientation') {
          // From orientation, go to first substage of connect
          setCurrentPage('connect-dyad');
        } else if (stageKey === 'connect') {
          // From connect, go to first substage of explore
          setCurrentPage('explore-catalyst');
        } else if (stageKey === 'explore') {
          // From explore, go to first substage of discover
          setCurrentPage('discover-fishbowl-catalyst');
        } else if (stageKey === 'discover') {
          // From discover, go to first substage of harvest
          setCurrentPage('harvest');
        } else if (stageKey === 'harvest') {
          // From harvest, go to first AI summary page
          console.log('Navigating from harvest to ai-summary-1');
          setCurrentPage('ai-summary-1');
        }
      }
    }
    

  };

  // Get current stage info for navigation
  const currentStageInfo = getCurrentStageAndSubstage();
  
  // Track page changes for development logging (must be outside conditional)
  const prevPage = React.useRef(currentPage);
  
  // Only log navigation changes in development
  if (process.env.NODE_ENV === 'development' && prevPage.current !== currentPage) {
    console.log('Page changed:', { from: prevPage.current, to: currentPage });
  }
  prevPage.current = currentPage;
  
  const canGoBack = currentIndex > 0 || (currentStageInfo && currentStageInfo.substageIndex > 0);
  const canGoForward = currentIndex < pages.length - 1 || (currentStageInfo && currentStageInfo.substageIndex < currentStageInfo.totalSubstages - 1);

  const navigationProps = {
    currentPage,
    currentIndex,
    totalPages: pages.length,
    canGoBack: canGoBack,
    canGoForward: canGoForward,
    onBack: () => {
      if (currentStageInfo) {
        navigateWithinStage('backward');
      } else if (currentIndex > 0) {
        setCurrentPage(pages[currentIndex - 1]);
      }
    },
    onForward: () => {
      if (currentStageInfo) {
        navigateWithinStage('forward');
      } else if (currentIndex < pages.length - 1) {
        setCurrentPage(pages[currentIndex + 1]);
      }
    },
    onNavigate: (page) => setCurrentPage(page),
    developmentMode: true,
    isHost,
    onHostNavigateStage: navigateToStage,
    onHostToggleVoting: (open) => {
      setIsVotingOpen(!!open);
      if (isHost && bus && bus.readyState === WebSocket.OPEN) {
        try { bus.send(JSON.stringify({ type: 'voting', sessionId, open: !!open })); } catch (_) {}
      }
    },
    vote: handleVote,
    voteState: voteState,
    isVotingOpen,
    isMuted,
    isCameraOff,
    isInCall,
    isLoopActive,
    onToggleMic: handleToggleMic,
    onToggleCamera: handleToggleCamera,
    onToggleCall: handleToggleCall,
    onToggleLoop: handleToggleLoop,
    totalTime: formatTime(totalTime),
    segmentTime: formatTime(segmentTime),
    activeSize,
    onSizeChange: handleSizeChange,
    participantCount: realParticipants.length > 0 ? realParticipants.length : 1093,
    voteTallies,
    participantName,
    onSetParticipantName: setParticipantName,
  };

  // Backend vote persistence linked to footer buttons
  useEffect(() => {
    const API_BASE = '';
    if (!sessionId || !breakoutId) return;

    const cast = async (dir) => {
      try {
        const res = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sessionId)}/breakout/${encodeURIComponent(breakoutId)}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote: dir, participantId: participantName || null })
        });
        if (res.ok) {
          const data = await res.json();
          setVoteTallies(data.tallies || { up: 0, down: 0, total: 0 });
        }
      } catch (e) {
        // swallow errors in dev
      }
    };

    if (voteState === 'up' || voteState === 'down') {
      cast(voteState);
    }
  }, [voteState, sessionId, breakoutId, participantName]);

  // Load session data from localStorage when sessionId changes (for participant-session page)
  useEffect(() => {
    if (currentPage === 'participant-session' && sessionId && !participantData) {
      console.log('🔍 App.js: Loading session data for:', sessionId);
      const storedSession = localStorage.getItem(`session_${sessionId}`);
      if (storedSession) {
        try {
          const parsedSession = JSON.parse(storedSession);
          const sessionData = {
            ...parsedSession,
            sessionId: sessionId // CRITICAL: Ensure sessionId matches URL parameter
          };
          console.log('🎯 Loaded session data from localStorage:', sessionData);
          console.log('🎯 Session participants count:', sessionData.participants?.length || 0);
          console.log('🎯 Session has room assignments:', !!sessionData.roomAssignments);
          setParticipantData(sessionData);
        } catch (error) {
          console.error('❌ Failed to parse session data:', error);
        }
      }
    }
  }, [currentPage, sessionId, participantData]);

  // Navigation guard: if someone hits participant-session directly but session isn't active,
  // route them to the lobby so the flow can start the main room cleanly
  useEffect(() => {
    if (currentPage !== 'participant-session' || !sessionId) return;
    try {
      const raw = localStorage.getItem(`session_${sessionId}`);
      if (!raw) {
        console.log('🛑 Guard: No session found, routing to participant-lobby');
        setCurrentPage('participant-lobby');
        return;
      }
      const data = JSON.parse(raw);
      const status = data?.status;
      const isActive = status === 'main-room-active' || status === 'rooms-assigned' || status === 'dialogue-active';
      if (!isActive) {
        console.log('🛑 Guard: Session not active (status =', status, ') → routing to participant-lobby');
        setParticipantData(data);
        setCurrentPage('participant-lobby');
      }
    } catch (_) {
      // Fail-safe route to lobby
      setCurrentPage('participant-lobby');
    }
  }, [currentPage, sessionId]);

  // Listen for session updates (e.g., when rooms are created)
  useEffect(() => {
    if (currentPage === 'participant-session' && sessionId) {
      const handleSessionUpdate = (event) => {
        const { sessionCode, sessionData } = event.detail;
        if (sessionCode === sessionId) {
          console.log('🔄 App.js: Session updated via event:', sessionData);
          console.log('🎯 Updated session has room assignments:', !!sessionData.roomAssignments);
          setParticipantData(sessionData);
        }
      };

      window.addEventListener('session-updated', handleSessionUpdate);
      return () => window.removeEventListener('session-updated', handleSessionUpdate);
    }
  }, [currentPage, sessionId]);

  let pageElement;
  switch (currentPage) {
    case 'session-lobby': {
      // Direct host lobby via URL: ?page=session-lobby&session=CODE&name=HOST
      const urlParams = new URLSearchParams(window.location.search);
      const sessionCodeParam = urlParams.get('session');
      const hostNameParam = urlParams.get('name') || sessionStorage.getItem('gd_current_participant_name') || 'Host';

      let sessionDataForLobby = null;
      if (sessionCodeParam) {
        try {
          const stored = localStorage.getItem(`session_${sessionCodeParam}`);
          if (stored) {
            sessionDataForLobby = JSON.parse(stored);
          }
        } catch (_) {}
        // Bootstrap session if missing
        if (!sessionDataForLobby) {
          sessionDataForLobby = {
            sessionId: sessionCodeParam,
            hostName: hostNameParam,
            participants: [{ id: 'host', name: hostNameParam, isHost: true, joinedAt: new Date().toISOString() }],
            createdAt: new Date().toISOString(),
            status: 'waiting',
            maxParticipants: 6,
            duration: 90,
            roomAssignments: null
          };
          try { localStorage.setItem(`session_${sessionCodeParam}`, JSON.stringify(sessionDataForLobby)); } catch (_) {}
        } else {
          // Ensure host participant exists
          const hasHost = (sessionDataForLobby.participants || []).some(p => p.isHost);
          if (!hasHost) {
            sessionDataForLobby.participants = [
              { id: 'host', name: hostNameParam, isHost: true, joinedAt: new Date().toISOString() },
              ...(sessionDataForLobby.participants || [])
            ];
            sessionDataForLobby.hostName = hostNameParam;
            try { localStorage.setItem(`session_${sessionCodeParam}`, JSON.stringify(sessionDataForLobby)); } catch (_) {}
          }
        }
      }

      pageElement = (
        <SessionLobby
          sessionData={sessionDataForLobby || { sessionId: sessionCodeParam || 'UNKNOWN', participants: [] }}
          onStartSession={(updatedSession) => {
            console.log('🎯 Host starting session from session-lobby:', updatedSession);
            setParticipantData(updatedSession);
            setSessionId(updatedSession.sessionId);
            setCurrentPage('participant-session');
          }}
          onLeaveSession={() => {
            setCurrentPage('landing');
            setParticipantData(null);
            setSessionId(null);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      );
      break;
    }
    case 'landing':
      pageElement = <LandingPage onContinue={handleContinueToInput} {...navigationProps} />;
      break;
    case 'signin':
      pageElement = (
        <AppLayout showBottomContent={false}>
          <ParticipantSignIn 
            onSignIn={handleParticipantSignIn}
            initialName={participantName}
            sessionId={sessionId}
            isHost={isHost}
          />
        </AppLayout>
      );
      break;
    case 'input':
      pageElement = <InputPage onContinue={handleInputComplete} {...navigationProps} />;
      break;
    case 'permissions':
      pageElement = <PermissionSetup onSetupComplete={handleSetupComplete} {...navigationProps} />;
      break;
    case 'videoconference':
      pageElement = <GenerativeDialogue {...navigationProps} />;
      break;
    case 'connect-dyad':
      pageElement = <ConnectDyadPage {...navigationProps} />;
      break;
    case 'dyad-dialogue-connect':
      pageElement = <DyadDialoguePageConnect {...navigationProps} />;
      break;
    case 'dyad-summary-review':
      pageElement = <DyadSummaryReviewPage {...navigationProps} />;
      break;
    case 'connect-dyad-collective-wisdom':
      pageElement = <ConnectDyadCollectiveWisdomPage {...navigationProps} />;
      break;
    case 'explore-catalyst':
      pageElement = <ExploreCatalystPage {...navigationProps} />;
      break;
    case 'explore-triad-dialogue':
      pageElement = <ExploreTriadDialoguePage {...navigationProps} />;
      break;
    case 'explore-triad-summary':
      pageElement = <ExploreTriadSummaryPage {...navigationProps} />;
      break;
    case 'explore-collective-wisdom':
      pageElement = <ExploreCollectiveWisdomPage {...navigationProps} />;
      break;
    case 'discover-fishbowl-catalyst':
      pageElement = <DiscoverFishbowlCatalystPage {...navigationProps} />;
      break;
    case 'discover-kiva-dialogue':
      pageElement = <DiscoverKivaDialoguePage {...navigationProps} />;
      break;
    case 'discover-kiva-summary':
      pageElement = <DiscoverKivaSummaryPage {...navigationProps} />;
      break;
    case 'discover-collective-wisdom':
      pageElement = <DiscoverCollectiveWisdomPage {...navigationProps} />;
      break;
    case 'harvest':
      pageElement = <HarvestPage {...navigationProps} />;
      break;
    case 'reflection':
      pageElement = <IndividualReflectionPage {...navigationProps} />;
      break;
    case 'ai-summary-1':
      pageElement = <AISummaryPage {...navigationProps} questionIndex={0} />;
      break;
    case 'ai-summary-2':
      pageElement = <AISummaryPage {...navigationProps} questionIndex={1} />;
      break;
    case 'ai-summary-3':
      pageElement = <AISummaryPage {...navigationProps} questionIndex={2} />;
      break;
    case 'ai-summary-4':
      pageElement = <AISummaryPage {...navigationProps} questionIndex={3} />;
      break;
    case 'ai-summary-5':
      pageElement = <AISummaryPage {...navigationProps} questionIndex={4} />;
      break;
    case 'ai-summary-6':
      pageElement = <AISummaryPage {...navigationProps} questionIndex={5} />;
      break;
    case 'ai-summary-7':
      pageElement = <AISummaryPage {...navigationProps} questionIndex={6} />;
      break;
    case 'harvest-outro':
      pageElement = <HarvestOutroPage {...navigationProps} />;
      break;
    case 'summary':
      pageElement = <SummaryPage {...navigationProps} />;
      break;
    case 'we-summary':
      pageElement = <WESummaryPage {...navigationProps} />;
      break;
    case 'new-insights':
      pageElement = <NewInsightsPage {...navigationProps} />;
      break;
    case 'questions':
      pageElement = <QuestionsPage {...navigationProps} />;
      break;
    case 'talkabout':
      pageElement = <TalkAboutPage {...navigationProps} />;
      break;
    case 'cantalk':
      pageElement = <CanTalkPage {...navigationProps} />;
      break;
    case 'emergingstory':
      pageElement = <EmergingStoryPage {...navigationProps} />;
      break;
    case 'ourstory':
      pageElement = <OurStoryPage {...navigationProps} />;
      break;
    case 'buildingcommunity':
      pageElement = <BuildingCommunityPage {...navigationProps} />;
      break;
    case 'dashboard':
      pageElement = <SimpleDashboard />;
      break;
    case 'room-manager':
      // Direct access to Room Assignment Manager
      const urlParams = new URLSearchParams(window.location.search);
      const sessionCodeParam = urlParams.get('session');
      
      if (!sessionCodeParam) {
        // Redirect to landing if no session code
        pageElement = (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <h2>🏠 Room Assignment Manager</h2>
            <p>Please provide a session code to access the Room Assignment Manager.</p>
            <button onClick={() => setCurrentPage('landing')}>← Back to Landing</button>
          </div>
        );
      } else {
        // Load session data and show Room Assignment Manager
        const storedSession = localStorage.getItem(`session_${sessionCodeParam}`);
        let sessionData = null;
        
        if (storedSession) {
          try {
            sessionData = JSON.parse(storedSession);
          } catch (error) {
            console.error('Failed to parse session data:', error);
          }
        }
        
        if (!sessionData) {
          pageElement = (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <h2>🏠 Room Assignment Manager</h2>
              <p>Session {sessionCodeParam} not found.</p>
              <button onClick={() => setCurrentPage('landing')}>← Back to Landing</button>
            </div>
          );
        } else {
          pageElement = (
            <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                <h1>🏠 Room Assignment Manager</h1>
                <p>Session: <strong>{sessionCodeParam}</strong> | Participants: <strong>{sessionData.participants?.length || 0}</strong></p>
                <button 
                  onClick={() => setCurrentPage('dashboard')}
                  style={{ marginRight: '10px', padding: '8px 16px' }}
                >
                  ← Back to Dashboard
                </button>
                <button 
                  onClick={() => setCurrentPage('landing')}
                  style={{ padding: '8px 16px' }}
                >
                  ← Back to Landing
                </button>
              </div>
              
              <RoomAssignmentManager
                sessionData={{
                  sessionId: sessionCodeParam,
                  participants: sessionData.participants || [],
                  roomConfiguration: {
                    roomType: ROOM_TYPES.DYAD,
                    allowRoomSwitching: true
                  }
                }}
                onRoomAssignmentsReady={(assignments) => {
                  console.log('🏠 Room assignments ready:', assignments);
                  // Update session data with room assignments
                  const sessionKey = `session_${sessionCodeParam}`;
                  const currentSession = JSON.parse(localStorage.getItem(sessionKey) || '{}');
                  const updatedSession = {
                    ...currentSession,
                    roomAssignments: assignments,
                    status: 'rooms-assigned'
                  };
                  localStorage.setItem(sessionKey, JSON.stringify(updatedSession));
                  
                  // Notify participants of room assignments
                  window.dispatchEvent(new CustomEvent('session-updated', {
                    detail: { sessionCode: sessionCodeParam, sessionData: updatedSession }
                  }));
                }}
                onError={(error) => {
                  console.error('❌ Room assignment error:', error);
                  alert(`Room assignment failed: ${error}`);
                }}
              />
            </div>
          );
        }
      }
      break;
    case 'participant-join':
      // Participant name input and session joining
      pageElement = (
        <ParticipantJoin
          sessionCode={sessionId}
          onJoinSession={(joinedSessionData) => {
            console.log('🎯 Participant joined session:', joinedSessionData);
            setParticipantData(joinedSessionData);
            setCurrentPage('participant-lobby');
          }}
          onBackToMain={() => {
            setCurrentPage('landing');
            setSessionId(null);
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      );
      break;
    case 'participant-lobby':
      // Participant lobby - wait for host to start and show room assignments
      pageElement = (
        <SessionLobby
          sessionData={participantData || { sessionId: sessionId, participants: [] }}
          onStartSession={(sessionDataWithRoom) => {
            console.log('🎯 Participant navigating to video session:', sessionDataWithRoom);
            setParticipantData(sessionDataWithRoom);
            setCurrentPage('participant-session');
          }}
          onLeaveSession={() => {
            setCurrentPage('landing');
            setParticipantData(null);
            setSessionId(null);
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      );
      break;
    case 'participant-session':
      // Enhanced participant session with room management
      
      // Use participantData directly (loaded by useEffect)
      let sessionData = participantData;
      
      // Fallback session data
      if (!sessionData) {
        sessionData = {
          sessionId: sessionId,
          participants: [],
          status: 'waiting'
        };
      }
      
      pageElement = (
        <GenerativeDialogue 
          canGoBack={false}
          canGoForward={false}
          onBack={() => {}}
          onForward={() => {}}
          currentPage={0}
          currentIndex={0}
          totalPages={1}
          developmentMode={false}
          isLoopActive={false}
          activeSize="all"
          onSizeChange={() => {}}
          sessionData={sessionData}
        />
      );
      break;
    case 'session-join':
      pageElement = (
        <SessionJoin 
          onJoinSession={(sessionData) => {
            console.log('🎯 Session joined/created:', sessionData);
            setParticipantData(sessionData);
            setSessionId(sessionData.sessionId);
            
            // ZOOM-LIKE WORKFLOW: Everyone goes to lobby first, then auto-moves to video when session starts
            const isHost = sessionData.currentParticipant?.isHost;
            if (isHost) {
              console.log('🎯 Host detected: Routing to participant-lobby (SessionLobby)');
              setCurrentPage('participant-lobby');
            } else {
              console.log('🎯 Participant detected: Routing to participant-lobby (SessionLobby) - will auto-move to video when session starts');
              setCurrentPage('participant-lobby');
            }
          }}
          sessionId={sessionId}
        />
      );
      break;
    default:
      pageElement = <LandingPage onContinue={handleContinueToInput} {...navigationProps} />;
  }

  const useAppLayout = !['landing', 'input', 'permissions', 'harvest-outro', 'buildingcommunity', 'dashboard', 'signin', 'participant-join', 'participant-lobby', 'room-manager', 'session-join', 'session-lobby'].includes(currentPage);

  // DISABLED: DEBUG: Log current page and routing decision - causing infinite render loop
  // console.log('🔍 App render debug:', {
  //   currentPage,
  //   useAppLayout,
  //   pageElementType: pageElement?.type?.name || 'unknown'
  // });

  return (
    <Router>
      <div className="App">
        {useAppLayout ? (
          <AppLayout {...navigationProps}>
            {pageElement}
          </AppLayout>
        ) : (
          pageElement
        )}
      </div>
    </Router>
  );
}

function App() {
  // Initialize error suppression on app start
  React.useEffect(() => {
    initializeErrorSuppression();
  }, []);

  return (
    <ErrorBoundary>
      <VideoProvider>
        <AppContent />
      </VideoProvider>
    </ErrorBoundary>
  );
}

export default App;
