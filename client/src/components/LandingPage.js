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
    <div className="landing-page">
      <div className="landing-container">
        <header className="landing-header">
          <div className="header-content">
            <div className="logo-container">
              <img 
                src="/images/EarthLogoSmallTransparent.png" 
                alt="Generative Dialogue Logo" 
                className="actual-logo"
              />
            </div>
            <h1 className="main-title">GENERATIVE DIALOGUE</h1>
          </div>
        </header>
        
        <main className="landing-content">
          <div className="hero-image-container">
            <img 
              src="/images/global-faces-sphere.jpg" 
              alt="Global sphere made of diverse human faces representing worldwide connection" 
              className="hero-image"
            />
            <div className="hero-overlay">
              <h2 className="subtitle">For A New Global WE</h2>
            </div>
          </div>
          
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
                conversation. Through structured dialogue experiences, we create spaces where creative interaction 
                flourishes and collective intelligence emerges.
              </p>
              
              <p>
                By bringing together diverse perspectives in facilitated conversations, we generate synergy 
                that transcends individual limitations and creates new possibilities for understanding, 
                collaboration, and collective action toward a more connected and sustainable future.
              </p>
            </div>
            
            <div className="navigation-section">
              <button className="continue-button" onClick={onContinue}>
                Begin Your Journey
                <span className="arrow-right">→</span>
              </button>
              
              {developmentMode && (
                <div className="dev-continue-option">
                  <p>Development Mode: Use navigation buttons above or continue normally</p>
                </div>
              )}
            </div>
          </div>
        </main>
        
        <footer className="landing-footer">
          <p>Step into a new paradigm of human connection and collective wisdom.</p>
        </footer>
      </div>

      {/* Development Navigation Footer */}
      {developmentMode && (
        <div className="dev-footer">
          <div className="dev-footer-content">
            <div className="page-info">
              <span className="page-indicator">Landing Page (1/3)</span>
            </div>
            <div className="nav-controls">
              <button 
                id="back-btn" 
                className="control-button"
                onClick={handleBackClick}
                onMouseEnter={() => canGoBack && setBackButtonState(backButtonState === 'on' ? 'on' : 'hover')}
                onMouseLeave={() => setBackButtonState(backButtonState === 'on' ? 'on' : 'off')}
                disabled={!canGoBack}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '50%',
                  boxShadow: 'none',
                  opacity: !canGoBack ? 0.4 : 1,
                  cursor: !canGoBack ? 'not-allowed' : 'pointer'
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
                onMouseEnter={() => canGoForward && setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'hover')}
                onMouseLeave={() => setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'off')}
                disabled={!canGoForward}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none',
                  borderRadius: '50%',
                  boxShadow: 'none',
                  overflow: 'hidden',
                  opacity: !canGoForward ? 0.4 : 1,
                  cursor: !canGoForward ? 'not-allowed' : 'pointer'
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
        </div>
      )}
    </div>
  );
};

export default LandingPage; 