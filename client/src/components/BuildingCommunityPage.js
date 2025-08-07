import React from 'react';
import './BuildingCommunityPage.css';
import FooterNavigation from './FooterNavigation';

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

      <div style={{background: 'red', color: 'white', padding: '10px', textAlign: 'center'}}>
        FOOTER TEST - This should be visible at the bottom
      </div>
      <FooterNavigation 
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={onBack}
        onForward={onForward}
        currentPage={currentPage}
        currentIndex={currentIndex}
        totalPages={totalPages}
        developmentMode={developmentMode}
        vote={() => {}}
        voteState="neutral"
        isMuted={false}
        isCameraOff={false}
        isInCall={true}
        onToggleMic={() => {}}
        onToggleCamera={() => {}}
        onToggleCall={() => {}}
        isLoopActive={false}
        onToggleLoop={() => {}}
        totalTime="00:00"
        segmentTime="00:00"
      />
    </div>
  );
};

export default BuildingCommunityPage; 