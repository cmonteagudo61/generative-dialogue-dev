import React, { useState } from 'react';
import NavigationMap from './NavigationMap';
import BottomContentArea from './BottomContentArea';
import './AppLayout.css';

const getHeaderLabel = (viewMode) => {
  switch (viewMode) {
    case 'self':
      return 'SELF VIEW';
    case 'dyad':
      return 'DYAD VIEW';
    case 'triad':
      return 'TRIAD VIEW';
    case 'quad':
      return 'QUAD VIEW';
    case 'kiva':
      return 'KIVA VIEW';
    case 'fishbowl':
      return 'FISHBOWL';
    default:
      return { line1: 'THE GATHERED', line2: 'COMMUNITY' };
  }
};

const STAGE_TABS = [
  { key: 'connect', label: 'CONNECT' },
  { key: 'explore', label: 'EXPLORE' },
  { key: 'discover', label: 'DISCOVER' },
  { key: 'harvest', label: 'HARVEST' },
];

const AppLayout = ({ children, activeSize, viewMode, onSizeChange, participantCount, onLoopToggle }) => {
  const [activeTab, setActiveTab] = useState('discover');

  return (
    <div className="app-container">
      {/* Header section: logo, nav, title and participant count */}
      <header className="header-section">
        <div className="header-upper-row">
          <div className="logo-container">
            <img src="/logo192.png" alt="Logo" style={{ width: 32, height: 32 }} />
          </div>
          <nav className="top-nav">
            {STAGE_TABS.map(tab => (
              <div
                key={tab.key}
                className={`stage-tab${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </div>
            ))}
          </nav>
          <div className="header-info">
            <div className="view-title">
              {typeof getHeaderLabel(viewMode) === 'string' ? (
                getHeaderLabel(viewMode)
              ) : (
                <div className="two-line-title">
                  <div>{getHeaderLabel(viewMode).line1}</div>
                  <div>{getHeaderLabel(viewMode).line2}</div>
                </div>
              )}
            </div>
          </div>
          <div className="participant-counter-fixed">
            {participantCount != null && (
              <span className="participant-badge">
                {participantCount} {participantCount === 1 ? 'live participant' : 'live participants'}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="main-content">

        {/* Video grid wrapper (contains left nav and video grid) */}
        <div className="grid-wrapper">
          <NavigationMap activeSize={activeSize} onSizeChange={onSizeChange} />
          <div className="viewing-area">
            <div className="view-content">
              {children}
            </div>
          </div>
        </div>

        {/* Bottom content area with tabs and control bar */}
        <BottomContentArea participantCount={participantCount} onLoopToggle={onLoopToggle} />
      </div>
    </div>
  );
};

export default AppLayout; 