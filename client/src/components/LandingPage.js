import React from 'react';
import FooterNavigation from './FooterNavigation';
import './LandingPage.css';

const LandingPage = ({ 
  onContinue, 
  developmentMode, 
  canGoBack, 
  canGoForward, 
  onBack, 
  onForward, 
  currentPage,
  isMuted,
  isCameraOff,
  isInCall,
  onToggleMic,
  onToggleCamera,
  onToggleCall,
  isLoopActive,
  onToggleLoop,
  vote,
  voteState,
  totalTime,
  segmentTime
}) => {
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
              
              {/* Dashboard Access */}
              <div className="dashboard-access">
                <button 
                  className="dashboard-btn"
                  onClick={() => window.location.href = window.location.origin + '?page=dashboard'}
                  title="Access the admin dashboard"
                >
                  🎛️ Admin Dashboard
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Unified Footer Navigation */}
      <FooterNavigation 
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={onBack}
        onForward={onForward}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isInCall={isInCall}
        onToggleMic={onToggleMic}
        onToggleCamera={onToggleCamera}
        onToggleCall={onToggleCall}
        isLoopActive={isLoopActive}
        onToggleLoop={onToggleLoop}
        vote={vote}
        voteState={voteState}
        totalTime={totalTime}
        segmentTime={segmentTime}
      />
    </div>
  );
};

export default LandingPage;
