import React, { useState, useEffect } from 'react';
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

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  // Check if user has already completed setup in this session
  useEffect(() => {
    const deviceInfo = localStorage.getItem('dialogueDeviceInfo');
    const sessionSetupComplete = sessionStorage.getItem('setupComplete');
    const dialogueParameters = localStorage.getItem('dialogueParameters');
    
    // Only auto-redirect if user has completed BOTH setup steps in the current session
    // This ensures we always start fresh on landing page unless actively in a session
    if (sessionSetupComplete === 'true' && deviceInfo && dialogueParameters) {
      setCurrentPage('videoconference');
    }
    // For partial completion, let user start fresh from landing page
    // They can navigate forward manually if they want to resume
  }, []);

  const handleContinueToInput = () => {
    setCurrentPage('input');
  };



  const handleInputComplete = () => {
    // After input page, go to permissions page
    setCurrentPage('permissions');
  };

  const handleSetupComplete = () => {
    // After permissions, mark setup as complete and go to video conference
    sessionStorage.setItem('setupComplete', 'true');
    setCurrentPage('videoconference');
  };

  const renderCurrentPage = () => {
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
      developmentMode: true
    };

    switch (currentPage) {
      case 'landing':
        return <LandingPage onContinue={handleContinueToInput} {...navigationProps} />;
      case 'input':
        return <InputPage onContinue={handleInputComplete} {...navigationProps} />;
      case 'permissions':
        return <PermissionSetup onSetupComplete={handleSetupComplete} {...navigationProps} />;
      case 'videoconference':
        return <GenerativeDialogue {...navigationProps} />;
      case 'connect-dyad':
        return <ConnectDyadPage {...navigationProps} />;
      case 'dyad-dialogue-connect':
        return <DyadDialoguePageConnect {...navigationProps} />;
      case 'dyad-summary-review':
        return <DyadSummaryReviewPage {...navigationProps} />;
      case 'connect-dyad-collective-wisdom':
        return <ConnectDyadCollectiveWisdomPage {...navigationProps} />;
      case 'explore-catalyst':
        return <ExploreCatalystPage {...navigationProps} />;
      case 'explore-triad-dialogue':
        return <ExploreTriadDialoguePage {...navigationProps} />;
      case 'explore-triad-summary':
        return <ExploreTriadSummaryPage {...navigationProps} />;
      case 'explore-collective-wisdom':
        return <ExploreCollectiveWisdomPage {...navigationProps} />;
      case 'discover-fishbowl-catalyst':
        return <DiscoverFishbowlCatalystPage {...navigationProps} />;
      case 'discover-kiva-dialogue':
        return <DiscoverKivaDialoguePage {...navigationProps} />;
      case 'discover-kiva-summary':
        return <DiscoverKivaSummaryPage {...navigationProps} />;
      case 'discover-collective-wisdom':
        return <DiscoverCollectiveWisdomPage {...navigationProps} />;
      case 'harvest':
        return <HarvestPage {...navigationProps} />;
      case 'reflection':
        return <IndividualReflectionPage {...navigationProps} />;
      case 'summary':
        return <SummaryPage {...navigationProps} />;
      case 'we-summary':
        return <WESummaryPage {...navigationProps} />;
      case 'new-insights':
        return <NewInsightsPage {...navigationProps} />;
      case 'questions':
        return <QuestionsPage {...navigationProps} />;
      case 'talkabout':
        return <TalkAboutPage {...navigationProps} />;
      case 'cantalk':
        return <CanTalkPage {...navigationProps} />;
      case 'emergingstory':
        return <EmergingStoryPage {...navigationProps} />;
      case 'ourstory':
        return <OurStoryPage {...navigationProps} />;
      case 'buildingcommunity':
        return <BuildingCommunityPage {...navigationProps} />;
      default:
        return <LandingPage onContinue={handleContinueToInput} {...navigationProps} />;
    }
  };

  return (
    <Router>
      <div className="App">
        <VideoProvider>
          {renderCurrentPage()}
        </VideoProvider>
      </div>
    </Router>
  );
}

export default App;