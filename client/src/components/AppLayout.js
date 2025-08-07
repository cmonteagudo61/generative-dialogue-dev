import React from 'react';
import NavigationMap from './NavigationMap';
import BottomContentArea from './BottomContentArea';
import FooterNavigation from './FooterNavigation';
import useMediaQuery from '../hooks/useMediaQuery';
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
  onToggleLoop,
  developmentMode,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  currentPage,
  showBottomContent = true,
  activeStage = null,
  defaultActiveTab = '',
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
  isHarvestClosing = false,
  isMuted,
  isCameraOff,
  isInCall,
  onToggleMic,
  onToggleCamera,
  onToggleCall,
  isLoopActive,
  vote,
  voteState,
  totalTime,
  segmentTime,
  onNavigate
}) => {
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const isMobile = useMediaQuery('(max-width: 480px)');
  console.log('isNarrow:', isNarrow, 'isMobile:', isMobile, 'participantCount:', participantCount);

  const getCurrentStage = () => {
    if (activeStage) return activeStage;
    if (currentPage === 'videoconference') return null; // Orientation page - no active stage
    if (currentPage === 'landing' || currentPage === 'input' || currentPage === 'permissions') return 'connect';
    if (currentPage === 'reflection') return 'harvest';
    if (currentPage.startsWith('connect-')) return 'connect';
    if (currentPage.startsWith('explore-')) return 'explore';
    if (currentPage.startsWith('discover-')) return 'discover';
    if (currentPage.startsWith('harvest') || currentPage === 'reflection' || currentPage === 'summary' || currentPage === 'we-summary' || currentPage === 'new-insights' || currentPage === 'questions' || currentPage === 'talkabout' || currentPage === 'cantalk' || currentPage === 'emergingstory' || currentPage === 'ourstory' || currentPage === 'buildingcommunity') return 'harvest';
    return 'connect';
  };

  const activeTab = getCurrentStage();

  // Navigation function for top navigation
  const handleStageNavigation = (stage) => {
    if (!onNavigate) return;
    
    switch (stage) {
      case 'connect':
        onNavigate('connect-dyad');
        break;
      case 'explore':
        onNavigate('explore-catalyst');
        break;
      case 'discover':
        onNavigate('discover-fishbowl-catalyst');
        break;
      case 'harvest':
        onNavigate('harvest');
        break;
      default:
        break;
    }
  };

  const headerInfo = (
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
      <div className="participant-counter-fixed">
        {participantCount != null && (
          <span className="participant-badge">
            {isMobile ? participantCount : `${participantCount} ${participantCount === 1 ? 'participant' : 'participants'}`}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className={`app-container ${viewMode === 'reflection' ? 'reflection-mode' : ''}`}>
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
                onClick={() => handleStageNavigation(tab.key)}
              >
                {tab.label}
              </div>
            ))}
          </nav>
          {!isNarrow && headerInfo}
        </div>
      </header>
      
      <div className="main-content">
        {isNarrow && <div className="secondary-header">{headerInfo}</div>}
        <div className="grid-wrapper">
          <NavigationMap activeSize={activeSize} onSizeChange={onSizeChange} />
          <div className="viewing-area">
            <div className="view-content">
              {children}
            </div>
          </div>
        </div>
        
        {showBottomContent && (
          <BottomContentArea
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

      {showBottomContent && (
        <FooterNavigation 
          {...{
            canGoBack,
            canGoForward,
            onBack,
            onForward,
            currentPage,
            participantCount,
            totalTime,
            segmentTime,
            isMuted,
            isCameraOff,
            isInCall,
            onToggleMic,
            onToggleCamera,
            onToggleCall,
            isLoopActive,
            onToggleLoop,
            vote,
            voteState
          }}
        />
      )}
    </div>
  );
};

export default AppLayout;
