import React from 'react';
import './FooterNavigation.css';

// Import navigation icons
import BackwardOff from '../assets/icons/direction-backward-off.svg';
import BackwardOn from '../assets/icons/direction-backward-on.svg';
import BackwardHover from '../assets/icons/direction-backward-hover.svg';
import ForwardOff from '../assets/icons/direction-forward-off.svg';
import ForwardOn from '../assets/icons/direction-forward-on.svg';
import ForwardHover from '../assets/icons/direction-forward-hover.svg';

const FooterNavigation = ({ currentPage, onNavigate }) => {
  const pages = ['landing', 'permissions', 'input', 'videoconference'];
  const currentIndex = pages.indexOf(currentPage);
  
  const canGoBack = currentIndex > 0;
  const canGoForward = currentIndex < pages.length - 1;

  const handleBackward = () => {
    if (canGoBack) {
      onNavigate(pages[currentIndex - 1]);
    }
  };

  const handleForward = () => {
    if (canGoForward) {
      onNavigate(pages[currentIndex + 1]);
    }
  };

  const getPageDisplayName = (page) => {
    switch (page) {
      case 'landing': return 'Landing Page';
      case 'permissions': return 'Permission Setup';
      case 'input': return 'Input Parameters';
      case 'videoconference': return 'Video Conference';
      default: return page;
    }
  };

  return (
    <div className="footer-navigation">
      <div className="footer-nav-content">
        {/* Page indicators */}
        <div className="page-indicators">
          {pages.map((page, index) => (
            <div 
              key={page}
              className={`page-indicator ${currentPage === page ? 'active' : ''}`}
              onClick={() => onNavigate(page)}
            >
              <div className="page-dot"></div>
              <span className="page-label">{getPageDisplayName(page)}</span>
            </div>
          ))}
        </div>

        {/* Navigation controls */}
        <div className="nav-controls">
          <button 
            className={`control-button nav-button ${!canGoBack ? 'disabled' : ''}`}
            onClick={handleBackward}
            disabled={!canGoBack}
            title="Previous Page"
          >
            <img 
              src={!canGoBack ? BackwardOff : BackwardOn} 
              alt="Previous" 
              className="nav-icon"
            />
          </button>

          <div className="current-page-info">
            <span className="page-counter">{currentIndex + 1} / {pages.length}</span>
            <span className="page-name">{getPageDisplayName(currentPage)}</span>
          </div>

          <button 
            className={`control-button nav-button ${!canGoForward ? 'disabled' : ''}`}
            onClick={handleForward}
            disabled={!canGoForward}
            title="Next Page"
          >
            <img 
              src={!canGoForward ? ForwardOff : ForwardOn} 
              alt="Next" 
              className="nav-icon"
            />
          </button>
        </div>

        {/* Development indicator */}
        <div className="dev-indicator">
          <span>DEV NAVIGATION</span>
        </div>
      </div>
    </div>
  );
};

export default FooterNavigation; 