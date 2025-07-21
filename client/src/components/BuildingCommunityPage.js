import React, { useState } from 'react';
import './BuildingCommunityPage.css';
import {
  directionBackwardOff,
  directionBackwardOn,
  directionBackwardHover,
  directionForwardOff,
  directionForwardOn,
  directionForwardHover
} from '../assets/icons';

const BuildingCommunityPage = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
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
    <div className="building-community-page">
      <div className="building-community-container">
        <header className="building-community-header">
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
        
        <main className="building-community-content">
          <div className="hero-section">
            <h2 className="building-title">
              BUILDING<br/>
              COMMUNITY/<br/>
              RELATIONSHIP/<br/>
              INTERBEING
            </h2>
          </div>
          
          <div className="diagram-section">
            <div className="circular-diagram">
              <div className="phase-item phase-1">
                <div className="phase-text">
                  TENDING/<br/>
                  EXPLORING
                </div>
              </div>
              
              <div className="phase-item phase-2">
                <div className="phase-text">
                  PRUNING/<br/>
                  DISCOVERING
                </div>
              </div>
              
              <div className="phase-item phase-3">
                <div className="phase-text">
                  HARVESTING/<br/>
                  DISCOVERING
                </div>
              </div>
              
              <div className="phase-item phase-4">
                <div className="phase-text">
                  TILLING/CONNECTING<br/>
                  (PREPARING THE SOIL)
                </div>
              </div>
              
              <div className="phase-item phase-5">
                <div className="phase-text">
                  PLANTING/<br/>
                  CONNECTING
                </div>
              </div>
              
              <div className="phase-item phase-6">
                <div className="phase-text">
                  WATERING/<br/>
                  EXPLORING
                </div>
              </div>
              
              <div className="center-text">
                <div className="participation-text">
                  Participation in the<br/>
                  Emergence of<br/>
                  Meaning
                </div>
              </div>
              
              <svg className="connecting-lines" viewBox="0 0 600 600" style={{zIndex: 1}}>
                {/* Single complete circle - behind labels */}
                <circle cx="300" cy="300" r="150" fill="none" stroke="#333" strokeWidth="3"/>
                
                {/* Four equilateral triangular arrowheads at 12, 3, 6, 9 o'clock */}
                <g style={{zIndex: 5}}>
                  {/* Arrow at 12 o'clock - pointing clockwise (right) */}
                  <polygon points="300,140 315,150 300,160" fill="#333" stroke="none"/>
                  
                  {/* Arrow at 3 o'clock - pointing clockwise (down) */}
                  <polygon points="450,310 442.5,290 457.5,290" fill="#333" stroke="none"/>
                  
                  {/* Arrow at 6 o'clock - pointing clockwise (left) */}
                  <polygon points="300,460 285,450 300,440" fill="#333" stroke="none"/>
                  
                  {/* Arrow at 9 o'clock - pointing clockwise (up) */}
                  <polygon points="150,290 142.5,310 157.5,310" fill="#333" stroke="none"/>
                </g>
              </svg>
            </div>
          </div>
        </main>
      </div>

      {/* Development Navigation Footer */}
      {developmentMode && (
        <div className="control-bar">
          <div className="page-info">
            <span className="page-indicator">Building Community ({currentIndex + 1}/{totalPages})</span>
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
      )}
    </div>
  );
};

export default BuildingCommunityPage; 