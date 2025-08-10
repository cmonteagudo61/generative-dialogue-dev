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
  const [voteState, setVoteState] = useState(null);
  const [voteTallies, setVoteTallies] = useState({ up: 0, down: 0, total: 0 });
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
    if (pageParam) {
      setCurrentPage(pageParam);
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
    vote: handleVote,
    voteState: voteState,
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
  };

  // Backend vote persistence linked to footer buttons
  useEffect(() => {
    const API_BASE = 'http://localhost:5680';
    // Identify session/breakout like the bottom area does
    let sid = localStorage.getItem('gd_session_id');
    if (!sid) {
      sid = `dev-session-${Date.now()}`;
      localStorage.setItem('gd_session_id', sid);
    }
    let bid = localStorage.getItem('gd_breakout_id');
    if (!bid) {
      bid = 'breakout-1';
      localStorage.setItem('gd_breakout_id', bid);
    }

    const cast = async (dir) => {
      try {
        const res = await fetch(`${API_BASE}/api/session/${encodeURIComponent(sid)}/breakout/${encodeURIComponent(bid)}/vote`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ vote: dir })
        });
        if (res.ok) {
          const data = await res.json();
          setVoteTallies(data.tallies || { up: 0, down: 0, total: 0 });
        }
      } catch (e) {
        // no-op in dev
      }
    };

    if (voteState === 'up' || voteState === 'down') {
      cast(voteState);
    }
  }, [voteState]);

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
