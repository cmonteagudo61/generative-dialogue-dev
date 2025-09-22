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
  voteTallies,
  totalTime,
  segmentTime,
  onNavigate,
  isHost,
  onHostNavigateStage,
  onHostToggleVoting,
  isVotingOpen,
  participantName,
  onSetParticipantName
}) => {
  const isNarrow = useMediaQuery('(max-width: 1100px)');
  const isMobile = useMediaQuery('(max-width: 480px)');
  // console.log('isNarrow:', isNarrow, 'isMobile:', isMobile, 'participantCount:', participantCount);

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
          <nav className="top-nav" style={{ flexWrap: 'nowrap' }}>
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
          {isHost && (localStorage.getItem('gd_show_dev_controls') === '1') && (
            <div className="host-controls" style={{ marginRight: 8 }}>
              <button className="control-button" onClick={() => onHostNavigateStage('connect')}>Go CONNECT</button>
              <button className="control-button" onClick={() => onHostNavigateStage('explore')}>Go EXPLORE</button>
              <button className="control-button" onClick={() => onHostNavigateStage('discover')}>Go DISCOVER</button>
              <button className="control-button" onClick={() => onHostNavigateStage('harvest')}>Go HARVEST</button>
              <button className="control-button" onClick={() => onHostToggleVoting(!isVotingOpen)}>{isVotingOpen ? 'Close Voting' : 'Open Voting'}</button>
            </div>
          )}
          {!isNarrow && headerInfo}
        </div>
      </header>
      
      <div className="main-content">
        {isNarrow && <div className="secondary-header">{headerInfo}</div>}
        <div className="grid-wrapper">
          <NavigationMap
            activeSize={activeSize}
            isHost={isHost}
            onSizeChange={(newSize) => {
              // Preserve existing behavior
              if (onSizeChange) onSizeChange(newSize);
              // Host-triggered breakout actions via nav
              try {
                // Only the host may trigger breakout actions
                const hostFlag = (isHost || localStorage.getItem('gd_is_host') === 'true');
                const map = { 2: 'dyad', 3: 'triad', 4: 'quad', 6: 'kiva', fishbowl: 'fishbowl' };
                if (hostFlag) {
                  if (newSize === 'all') {
                    console.log('[HostNav] End Breakouts via nav');
                    window.dispatchEvent(new CustomEvent('host-end-breakouts'));
                  } else if (map[newSize]) {
                    console.log('[HostNav] Create breakouts via nav:', map[newSize]);
                    window.dispatchEvent(new CustomEvent('host-create-breakouts', { detail: { roomType: map[newSize] } }));
                  }
                }
                // Broadcast active icon for participants to highlight
                const prev = localStorage.getItem('gd_active_size');
                const next = String(newSize);
                if (prev !== next) localStorage.setItem('gd_active_size', next);
              } catch (_) {}
            }}
          />
          <div className="viewing-area">
            <div className="view-content">
              {children}
              {!isHost && (!participantName || participantName.trim().length === 0) && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
                  <div style={{ background: 'white', padding: 16, borderRadius: 8, width: 320 }}>
                    <h4 style={{ marginTop: 0, marginBottom: 8, color: '#3E4C71' }}>Enter your name</h4>
                    <input type="text" placeholder="Your display name" style={{ width: '100%', padding: 8, border: '1px solid #e0e0e0', borderRadius: 6 }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { const v = e.currentTarget.value.trim(); if (v) { onSetParticipantName(v); localStorage.setItem('gd_participant_name', v); } } }}
                    />
                    <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button className="control-button" onClick={() => { const inputEl = document.querySelector('input[placeholder="Your display name"]'); const v = inputEl ? inputEl.value.trim() : ''; if (v) { onSetParticipantName(v); localStorage.setItem('gd_participant_name', v); } }}>Continue</button>
                    </div>
                  </div>
                </div>
              )}
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
            voteTallies={voteTallies}
            isHost={isHost}
            isVotingOpen={isVotingOpen}
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
