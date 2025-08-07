import React, { useState, useMemo } from 'react';
import './HarvestOutroPage.css';
import { useVideo } from './VideoProvider';
import FooterNavigation from './FooterNavigation';

const HarvestOutroPage = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {
  // Set up for SELF view to make self button active
  const [activeView, setActiveView] = useState(1); // Self view (1 person)
  
  // Get participant count from VideoProvider
  const { realParticipants } = useVideo();
  const participantCount = useMemo(() => {
    // For demo purposes, show a fixed count if no real participants
    return realParticipants.length > 0 ? realParticipants.length : 1093;
  }, [realParticipants]);

  const handleViewChange = (newView) => setActiveView(newView);

  const outroContent = (
    <div className="harvest-outro-container">
      <div className="outro-header">
        <h1 className="hero-subtitle">GENERATIVE DIALOGUE</h1>
        <h2 className="outro-subtitle">BUILDING COMMUNITY/RELATIONSHIP/INTERBEING</h2>
      </div>
      
      <div className="outro-graphic">
        <div className="graphic-circle">
          <div className="circle-center">
            <span className="center-text">Participation in the Emergence of Meaning</span>
          </div>
          <div className="circle-elements">
            <div className="circle-element element-1">
              <div className="element-circle"></div>
              <span className="element-text">TENDING/EXPLORING</span>
            </div>
            <div className="circle-element element-2">
              <div className="element-circle"></div>
              <span className="element-text">PRUNING/DISCOVERING</span>
            </div>
            <div className="circle-element element-3">
              <div className="element-circle"></div>
              <span className="element-text">HARVESTING/DISCOVERING</span>
            </div>
            <div className="circle-element element-4">
              <div className="element-circle"></div>
              <span className="element-text">TILLING/CONNECTING (PREPARING THE SOIL)</span>
            </div>
            <div className="circle-element element-5">
              <div className="element-circle"></div>
              <span className="element-text">PLANTING/CONNECTING</span>
            </div>
            <div className="circle-element element-6">
              <div className="element-circle"></div>
              <span className="element-text">WATERING/EXPLORING</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer Navigation */}
      <FooterNavigation
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={onBack}
        onForward={onForward}
        currentPage={currentPage}
        currentIndex={currentIndex}
        totalPages={totalPages}
        developmentMode={developmentMode}
      />
    </div>
  );

  return outroContent;
};

export default HarvestOutroPage; 