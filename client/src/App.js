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
import SummaryPage from './components/SummaryPage';
import WESummaryPage from './components/WESummaryPage';
import NewInsightsPage from './components/NewInsightsPage';
import QuestionsPage from './components/QuestionsPage';
import TalkAboutPage from './components/TalkAboutPage';
import CanTalkPage from './components/CanTalkPage';
import EmergingStoryPage from './components/EmergingStoryPage';
import OurStoryPage from './components/OurStoryPage';
import BuildingCommunityPage from './components/BuildingCommunityPage';
import { VideoProvider } from './components/VideoProvider';
import AppLayout from './components/AppLayout';

const formatTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

function App() {
  const [currentPage, setCurrentPage] = useState('landing');
  const [voteState, setVoteState] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isInCall, setIsInCall] = useState(true);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [segmentTime, setSegmentTime] = useState(300); // 5-minute segment countdown

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

  useEffect(() => {
    const deviceInfo = localStorage.getItem('dialogueDeviceInfo');
    const sessionSetupComplete = sessionStorage.getItem('setupComplete');
    const dialogueParameters = localStorage.getItem('dialogueParameters');
    
    if (sessionSetupComplete === 'true' && deviceInfo && dialogueParameters) {
      setCurrentPage('videoconference');
    }
  }, []);

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

  const pages = ['landing', 'input', 'permissions', 'videoconference', 'connect-dyad', 'dyad-dialogue-connect', 'dyad-summary-review', 'connect-dyad-collective-wisdom', 'explore-catalyst', 'explore-triad-dialogue', 'explore-triad-summary', 'explore-collective-wisdom', 'discover-fishbowl-catalyst', 'discover-kiva-dialogue', 'discover-kiva-summary', 'discover-collective-wisdom', 'harvest', 'reflection', 'summary', 'we-summary', 'new-insights', 'questions', 'talkabout', 'cantalk', 'emergingstory', 'ourstory', 'buildingcommunity'];
  const currentIndex = pages.indexOf(currentPage);
  
  const navigationProps = {
    currentPage,
    currentIndex,
    totalPages: pages.length,
    canGoBack: currentIndex > 0,
    canGoForward: currentIndex < pages.length - 1,
    onBack: () => currentIndex > 0 && setCurrentPage(pages[currentIndex - 1]),
    onForward: () => currentIndex < pages.length - 1 && setCurrentPage(pages[currentIndex + 1]),
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
  };

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

  const useAppLayout = !['landing', 'input', 'permissions'].includes(currentPage);

  return (
    <Router>
      <div className="App">
        <VideoProvider>
          {useAppLayout ? (
            <AppLayout {...navigationProps}>
              {pageElement}
            </AppLayout>
          ) : (
            pageElement
          )}
        </VideoProvider>
      </div>
    </Router>
  );
}

export default App;
