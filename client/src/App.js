import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import GenerativeDialogue from './components/GenerativeDialogue';
import LandingPage from './components/LandingPage';
import PermissionSetup from './components/PermissionSetup';
import InputPage from './components/InputPage';
import IndividualReflectionPage from './components/IndividualReflectionPage';
import SummaryPage from './components/SummaryPage';
import { VideoProvider } from './components/VideoProvider';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  // Check if user has already completed setup in this session
  useEffect(() => {
    const deviceInfo = localStorage.getItem('dialogueDeviceInfo');
    const sessionSetupComplete = sessionStorage.getItem('setupComplete');
    const dialogueParameters = localStorage.getItem('dialogueParameters');
    
    // If user has completed both input parameters and permissions, go to video conference
    if (sessionSetupComplete === 'true' && deviceInfo && dialogueParameters) {
      setCurrentPage('videoconference');
    }
    // If user has completed input parameters but not permissions, go to permissions page
    else if (dialogueParameters && !deviceInfo) {
      setCurrentPage('permissions');
    }
    // If user has completed permissions but not input parameters, go to input page
    else if (deviceInfo && !dialogueParameters) {
      setCurrentPage('input');
    }
  }, []);

  const handleContinueToInput = () => {
    setCurrentPage('input');
  };

  const handleContinueToPermissions = () => {
    setCurrentPage('permissions');
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
    const pages = ['landing', 'input', 'permissions', 'videoconference', 'reflection', 'summary'];
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
      case 'reflection':
        return <IndividualReflectionPage {...navigationProps} />;
      case 'summary':
        return <SummaryPage {...navigationProps} />;
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