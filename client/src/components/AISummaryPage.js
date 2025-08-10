import React, { useState, useMemo } from 'react';
import './AISummaryPage.css';
import { useVideo } from './VideoProvider';
import FooterNavigation from './FooterNavigation';

const AISummaryPage = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode,
  questionIndex = 0 // Which question this summary is for
}) => {
  // Debug logging
  console.log('AISummaryPage rendered with questionIndex:', questionIndex);
  console.log('AISummaryPage props:', { canGoBack, canGoForward, currentPage, currentIndex, totalPages, developmentMode });
  // Set up for SELF view to make self button active
  const [activeView, setActiveView] = useState(1); // Self view (1 person)
  
  // Get participant count from VideoProvider
  const { realParticipants } = useVideo();
  const participantCount = useMemo(() => {
    // For demo purposes, show a fixed count if no real participants
    return realParticipants.length > 0 ? realParticipants.length : 1093;
  }, [realParticipants]);

  const handleViewChange = (newView) => setActiveView(newView);

  // Questions that match the input page
  const questions = [
    'What connects us?',
    'What still divides us?',
    'What is one important insight from today?',
    'What question do you still hold?',
    'What do you need to talk about?',
    'What are you ready to talk about?',
    'What story is emerging?'
  ];

  const currentQuestion = questions[questionIndex] || questions[0];

  const summaryContent = (
    <div className="ai-summary-container">
      <div className="summary-header">
        <h1 className="hero-subtitle">AI WE SUMMARY</h1>
        <h2 className="question-title">{currentQuestion}</h2>
      </div>
      
      <div className="summary-content">
        {/* Top scrollable section - AI Summary */}
        <div className="summary-top-section">
          <div className="summary-text">
            {/* AI summary content will be integrated here */}
          </div>
        </div>
        
        {/* Bottom scrollable section - Analysis */}
        <div className="summary-bottom-section">
          <h3 className="analysis-title">Analysis</h3>
          <div className="themes-list">
            {/* Analysis content will be integrated here */}
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

  return summaryContent;
};

export default AISummaryPage; 