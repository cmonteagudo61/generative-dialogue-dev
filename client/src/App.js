import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Import components
import GenerativeDialogue from './components/GenerativeDialogue';
import LandingPage from './components/LandingPage';

function App() {
  const [showLandingPage, setShowLandingPage] = useState(true);

  // Check if user has already completed setup in this session
  useEffect(() => {
    const deviceInfo = localStorage.getItem('dialogueDeviceInfo');
    const sessionSetupComplete = sessionStorage.getItem('setupComplete');
    
    // If user has completed setup in this session, skip landing page
    if (sessionSetupComplete === 'true' && deviceInfo) {
      setShowLandingPage(false);
    }
  }, []);

  const handleSetupComplete = () => {
    // Mark setup as complete for this session
    sessionStorage.setItem('setupComplete', 'true');
    setShowLandingPage(false);
  };

  return (
    <Router>
      <div className="App">
        {showLandingPage ? (
          <LandingPage onSetupComplete={handleSetupComplete} />
        ) : (
          <Routes>
            <Route path="/" element={<GenerativeDialogue />} />
          </Routes>
        )}
      </div>
    </Router>
  );
}

export default App;