import React from 'react';
import AppLayout from './AppLayout';
import './BuildingCommunityPage.css';

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

  const communityContent = (
    <div className="buildingcommunity-container">
      <div className="page-header">
        <h1 className="generative-dialogue-title">GENERATIVE DIALOGUE</h1>
        <h2 className="building-title">
          BUILDING<br/>
          COMMUNITY/<br/>
          RELATIONSHIP/<br/>
          INTERBEING
        </h2>
      </div>
    </div>
  );

  return (
    <AppLayout 
      viewMode="videoconference"
      onViewModeChange={() => {}}
      showVideoGrid={false}
      showBottomContent={false}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onBack={onBack}
      onForward={onForward}
      currentPage={currentPage}
      currentIndex={currentIndex}
      totalPages={totalPages}
      developmentMode={developmentMode}
    >
      {communityContent}
    </AppLayout>
  );
};

export default BuildingCommunityPage; 