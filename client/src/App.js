import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import './App.css';

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
import { VideoProvider, useVideo } from './components/VideoProvider';
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
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isInCall, setIsInCall] = useState(true);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [segmentTime, setSegmentTime] = useState(300); // 5-minute segment countdown
  const [activeSize, setActiveSize] = useState('all'); // Add state for left navigation

  // Parse URL parameters to set the current page
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    const roleParam = urlParams.get('role');
    const sidParam = urlParams.get('sessionId');
    const bidParam = urlParams.get('breakoutId');
    const nameParam = urlParams.get('name');
    if (pageParam) {
      setCurrentPage(pageParam);
    }
    setIsHost(roleParam === 'host');

    // If join params exist, persist them and set immediately for cross-device join
    if (sidParam) {
      localStorage.setItem('gd_session_id', sidParam);
      setSessionId(sidParam);
    }
    if (bidParam) {
      localStorage.setItem('gd_breakout_id', bidParam);
      setBreakoutId(bidParam);
    }
    const storedName = nameParam || localStorage.getItem('gd_participant_name') || '';
    if (storedName) setParticipantName(storedName);
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

  const handleContinueToInput = () => {
    setCurrentPage('input');
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
      if (sid) setSessionId(sid);
      if (bid) setBreakoutId(bid);
    };
    // If params provided were already set above, skip auto-create
    if (!sid || !bid) {
      ensure();
    } else {
      setSessionId(sid);
      setBreakoutId(bid);
    }
  }, []);

  // Session bus: real-time host → participants updates
  useEffect(() => {
    if (!sessionId) return;
    try {
      const API_PROTO = window.location.protocol === 'https:' ? 'https' : 'http';
      const WS_PROTO = API_PROTO === 'https' ? 'wss' : 'ws';
      const ws = new WebSocket(`${WS_PROTO}://${window.location.host}/session-bus`);
      ws.onopen = () => {
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
            // Bubble up to a simple custom event so BottomContentArea can append
            window.dispatchEvent(new CustomEvent('gd-remote-transcript', { detail: { text: msg.text, isFinal: !!msg.isFinal } }));
          } else if (msg.type === 'ai' && (msg.enhancedText || msg.summaryText || msg.themesText)) {
            window.dispatchEvent(new CustomEvent('gd-remote-ai', { detail: {
              enhancedText: msg.enhancedText || '',
              summaryText: msg.summaryText || '',
              themesText: msg.themesText || '',
              service: msg.service || ''
            }}));
          } else if (msg.type === 'voteTallies' && msg.tallies) {
            setVoteTallies(msg.tallies);
          }
        } catch (_) { /* ignore */ }
      };
      ws.onclose = () => {};
      setBus(ws);
      return () => { try { ws.close(); } catch (_) {} };
    } catch (_) { /* ignore */ }
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
  console.log('Current stage info:', { 
    currentPage, 
    currentStageInfo: currentStageInfo ? {
      stageKey: currentStageInfo.stageKey,
      substageIndex: currentStageInfo.substageIndex,
      totalSubstages: currentStageInfo.totalSubstages
    } : null, 
    currentIndex 
  });
  const canGoBack = currentIndex > 0 || (currentStageInfo && currentStageInfo.substageIndex > 0);
  const canGoForward = currentIndex < pages.length - 1 || (currentStageInfo && currentStageInfo.substageIndex < currentStageInfo.totalSubstages - 1);
  console.log('Navigation props:', { 
    canGoBack, 
    canGoForward, 
    currentIndex, 
    totalPages: pages.length,
    currentPage 
  });

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

  let pageElement;
  switch (currentPage) {
    case 'landing':
      pageElement = <LandingPage onContinue={handleContinueToInput} {...navigationProps} />;
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
    default:
      pageElement = <LandingPage onContinue={handleContinueToInput} {...navigationProps} />;
  }

  const useAppLayout = !['landing', 'input', 'permissions', 'harvest-outro', 'buildingcommunity'].includes(currentPage);

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
  return (
    <VideoProvider>
      <AppContent />
    </VideoProvider>
  );
}

export default App;
