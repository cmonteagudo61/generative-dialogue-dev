import React, { useState } from 'react';
import './LandingPage.css';
import {
  directionBackwardOff,
  directionBackwardOn,
  directionBackwardHover,
  directionForwardOff,
  directionForwardOn,
  directionForwardHover
} from '../assets/icons';

const LandingPage = ({ 
  onContinue, 
  developmentMode, 
  canGoBack, 
  canGoForward, 
  onBack, 
  onForward, 
  currentPage 
}) => {
  const [backButtonState, setBackButtonState] = useState('off');
  const [forwardButtonState, setForwardButtonState] = useState('off');

  const getBackButtonIcon = () => {
    switch (backButtonState) {
      case 'on': return directionBackwardOn;
      case 'hover': return directionBackwardHover;
      default: return directionBackwardOff;
    }
  };

  const getForwardButtonIcon = () => {
    switch (forwardButtonState) {
      case 'on': return directionForwardOn;
      case 'hover': return directionForwardHover;
      default: return directionForwardOff;
    }
  };

  const handleBackClick = () => {
    if (canGoBack && onBack) {
      setBackButtonState('on');
      onBack();
      setTimeout(() => setBackButtonState('off'), 200);
    }
  };

  const handleForwardClick = () => {
    if (canGoForward && onForward) {
      setForwardButtonState('on');
      onForward();
      setTimeout(() => setForwardButtonState('off'), 200);
    }
  };

  return (
    <div className="landing-page-container">
      {/* Fixed Header */}
      <header className="landing-header">
        <div className="header-content">
          <div className="logo-container">
            <img 
              src="/images/EarthLogoSmallTransparent.png" 
              alt="Generative Dialogue Logo" 
              className="actual-logo"
            />
          </div>
          <div className="title-section">
            <h1 className="main-title">GENERATIVE DIALOGUE</h1>
          </div>
        </div>
      </header>

      {/* Fixed Hero Banner */}
      <div className="hero-image-container fixed-hero">
        <img 
          src="/images/global-faces-sphere.jpg" 
          alt="Global sphere made of diverse human faces representing worldwide connection" 
          className="hero-image"
        />
        <div className="hero-overlay">
          <h2 className="hero-subtitle">For A New Global WE</h2>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="scrollable-content">
        <main className="landing-main">
          <div className="content-section">
            <div className="overview-text">
              <p>
                In an era where technology has increasingly separated us from nature and authentic human connection, 
                we find ourselves longing for deeper meaning and genuine community. The digital revolution, while 
                advancing human capability, has created unprecedented levels of isolation and disconnection from 
                the natural world that once grounded us.
              </p>
              
              <p>
                Generative Dialogue harnesses the power of AI technology not to further separate us, but to 
                reconnect us with our essential humanity and the natural wisdom that flows through meaningful 
                conversation. Through structured dialogue experiences, we create spaces where creative interaction, 
                deep listening, and collective intelligence can emerge organically.
              </p>
              
              <p>
                Step into a transformative journey where technology serves as a bridge back to authentic human 
                connection, where diverse voices unite in creative collaboration, and where the collective wisdom 
                of our global community can flourish in service of our shared future.
              </p>
              
              <p className="footer-message">
                <em>Step into a new paradigm of human connection and collective wisdom</em>
              </p>
            </div>
          </div>
        </main>
      </div>

      {/* Fixed Footer - Outside scrollable area */}
      {developmentMode && (
        <div className="control-bar">
          {/* Navigation controls - exact copy from BottomContentArea */}
          <div style={{display: 'flex'}}>
            <button 
              id="back-btn" 
              className="control-button"
              onClick={handleBackClick}
              onMouseEnter={() => (!developmentMode || canGoBack) && setBackButtonState(backButtonState === 'on' ? 'on' : 'hover')}
              onMouseLeave={() => setBackButtonState(backButtonState === 'on' ? 'on' : 'off')}
              disabled={developmentMode && !canGoBack}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                borderRadius: '50%',
                boxShadow: 'none',
                opacity: (developmentMode && !canGoBack) ? 0.4 : 1,
                cursor: (developmentMode && !canGoBack) ? 'not-allowed' : 'pointer'
              }}
            >
              <img 
                src={getBackButtonIcon()} 
                alt="Back" 
                style={{width: '34px', height: '34px'}}
              />
            </button>
            <button 
              id="forward-btn" 
              className="control-button"
              onClick={handleForwardClick}
              onMouseEnter={() => (!developmentMode || canGoForward) && setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'hover')}
              onMouseLeave={() => setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'off')}
              disabled={developmentMode && !canGoForward}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                borderRadius: '50%',
                boxShadow: 'none',
                overflow: 'hidden',
                opacity: (developmentMode && !canGoForward) ? 0.4 : 1,
                cursor: (developmentMode && !canGoForward) ? 'not-allowed' : 'pointer'
              }}
            >
              <img 
                src={getForwardButtonIcon()} 
                alt="Forward" 
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage; 