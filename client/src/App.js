import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import GenerativeDialogue from './components/GenerativeDialogue';
import LandingPage from './components/LandingPage';
import PermissionSetup from './components/PermissionSetup';
import { VideoProvider } from './components/VideoProvider';

function App() {
  const [currentPage, setCurrentPage] = useState('landing');

  // Check if user has already completed setup in this session
  useEffect(() => {
    const deviceInfo = localStorage.getItem('dialogueDeviceInfo');
    const sessionSetupComplete = sessionStorage.getItem('setupComplete');
    
    // If user has completed setup in this session, skip to video conference
    if (sessionSetupComplete === 'true' && deviceInfo) {
      setCurrentPage('videoconference');
    }
  }, []);

  const handleContinueToPermissions = () => {
    setCurrentPage('permissions');
  };

  const handleSetupComplete = () => {
    // Mark setup as complete for this session
    sessionStorage.setItem('setupComplete', 'true');
    setCurrentPage('videoconference');
  };

  const renderCurrentPage = () => {
    const pages = ['landing', 'permissions', 'videoconference'];
    const currentIndex = pages.indexOf(currentPage);
    
    const navigationProps = {
      currentPage,
      currentIndex,
      totalPages: pages.length,
      canGoBack: currentIndex > 0,
      canGoForward: currentIndex < pages.length - 1,
      onBack: () => currentIndex > 0 && setCurrentPage(pages[currentIndex - 1]),
      onForward: () => currentIndex < pages.length - 1 && setCurrentPage(pages[currentIndex + 1]),
      developmentMode: true
    };

    switch (currentPage) {
      case 'landing':
        return <LandingPage onContinue={handleContinueToPermissions} {...navigationProps} />;
      case 'permissions':
        return <PermissionSetup onSetupComplete={handleSetupComplete} {...navigationProps} />;
      case 'videoconference':
        return <GenerativeDialogue {...navigationProps} />;
      default:
        return <LandingPage onContinue={handleContinueToPermissions} {...navigationProps} />;
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