import React from 'react';
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
    case 'reflection':
      return 'INDIVIDUAL REFLECTION';
    case 'summary':
      return 'AI WE SUMMARY';
    default:
      return 'THE GATHERED COMMUNITY';
  }
};

const STAGE_TABS = [
  { key: 'connect', label: 'CONNECT' },
  { key: 'explore', label: 'EXPLORE' },
  { key: 'discover', label: 'DISCOVER' },
  { key: 'harvest', label: 'HARVEST' },
];

const AppLayout = ({ 
  children, 
  activeSize, 
  viewMode, 
  onSizeChange, 
  participantCount, 
  onLoopToggle,
  developmentMode,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  currentPage,
  showBottomContent = true,
  activeStage = null, // Allow explicit stage override
  defaultActiveTab = '', // Allow pages to set default active tab
  dialogueQuestion = '',
  dialogueTimeframe = '',
  dialogueFormat = '',
  isDialogueActive = false,
  isSummaryReview = false,
  isCollectiveWisdom = false,
  isFishbowlCatalyst = false,
  isKivaDialogue = false,
  isKivaSummaryReview = false,
  isDiscoverCollectiveWisdom = false,
  isHarvestClosing = false
}) => {
  // Remove experimental debugging behavior - use currentPage for navigation state
  const getCurrentStage = () => {
    // If activeStage is explicitly passed, use it
    if (activeStage) return activeStage;
    
    // Map currentPage to stage based on application flow
    if (currentPage === 'videoconference') return null; // Videoconference - no active tabs
    if (currentPage === 'landing' || currentPage === 'input' || currentPage === 'permissions') return 'connect';
    if (currentPage === 'reflection') return 'discover';
    return 'harvest'; // Summary pages and beyond
  };

  const activeTab = getCurrentStage();

  return (
    <div className={`app-container ${viewMode === 'reflection' ? 'reflection-mode' : ''}`}>
      {/* Header section: logo, nav, title and participant count */}
      <header className="header-section">
        <div className="header-upper-row">
          <div className="logo-container">
            <img src="/images/EarthLogoSmallTransparent.png" alt="Logo" className="app-logo" />
          </div>
          <nav className="top-nav">
            {STAGE_TABS.map(tab => (
              <div
                key={tab.key}
                className={`stage-tab${activeTab === tab.key ? ' active' : ''}`}
                onClick={() => {
                  // Remove debugging behavior - implement proper navigation
                  // For now, provide visual feedback only
                  console.log(`Navigating to ${tab.label} stage`);
                  // Future: Add proper navigation logic here
                }}
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
            <div className="participant-counter-mobile">
              {participantCount != null && (
                <span className="participant-badge">
                  {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
                </span>
              )}
            </div>
          </div>
          <div className="participant-counter-fixed">
            {participantCount != null && (
              <span className="participant-badge">
                {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
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
        {showBottomContent && (
          <BottomContentArea 
            participantCount={participantCount} 
            onLoopToggle={onLoopToggle}
            developmentMode={developmentMode}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={onBack}
            onForward={onForward}
            currentPage={currentPage}
            defaultActiveTab={defaultActiveTab}
            dialogueQuestion={dialogueQuestion}
            dialogueTimeframe={dialogueTimeframe}
            dialogueFormat={dialogueFormat}
            isDialogueActive={isDialogueActive}
            isSummaryReview={isSummaryReview}
            isCollectiveWisdom={isCollectiveWisdom}
            isFishbowlCatalyst={isFishbowlCatalyst}
            isKivaDialogue={isKivaDialogue}
            isKivaSummaryReview={isKivaSummaryReview}
            isDiscoverCollectiveWisdom={isDiscoverCollectiveWisdom}
            isHarvestClosing={isHarvestClosing}
          />
        )}
      </div>
    </div>
  );
};

export default AppLayout; 