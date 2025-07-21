import React, { useMemo } from 'react';
import AppLayout from './AppLayout';
import { useVideo } from './VideoProvider';
import './NewInsightsPage.css';

const NewInsightsPage = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {
  // Get participant count from VideoProvider
  const { realParticipants } = useVideo();
  const participantCount = useMemo(() => {
    // For demo purposes, show a fixed count if no real participants
    return realParticipants.length > 0 ? realParticipants.length : 1093;
  }, [realParticipants]);

  const summaryContent = (
    <div className="new-insights-container">
      <div className="new-insights-header">
        <div className="header-titles">
          <h1 className="new-insights-title">AI WE Summary</h1>
          <h2 className="new-insights-subtitle">What New Insights?</h2>
        </div>
      </div>
      
      <div className="new-insights-content">
        <div className="new-insights-text">
          <p>
            Aliquam porta nisl dolor, molestie pellentesque elit molestie in. Morbi metus neque, elementum 
            ullamcorper hendrerit eget, tincidunt et nisl. Sed magna nunc, consequat vel aliquam vitae, porta ac 
            mi. Integer commodo sapien lacus, nec interdum nisl vehicula aliquam. Aliquam enim lorem, laoreet ut 
            egestas quis, rutrum sed lectus. Duis et purus in dolor bibendum egestas vel vitae urna. Vestibulum 
            dictum semper laoreet. Nulla augue tellus, aliquam mollis quam eget, maximus iaculis sem. Praesent 
            semper ex tortor, in rhoncus arcu sollicitudin ut. Donec magna lorem, efficitur quis fringilla sed, 
            imperdiet sed risus. Nam accumsan, elit sit amet pretium commodo, turpis augue molestie eros, quis 
            maximus diam ex eget libero. Aliquam erat volutpat. Integer interdum arcu nisl. Cras venenatis lorem in 
            molestie pulvinar. Donec a tortor et magna suscipit consectetur. Sed mi lacus, vehicula id ex nec, 
            vulputate pretium urna. Aenean accumsan facilisis ornare. Aenean porttitor augue at erat aliquam, quis 
            mattis nunc egestas. Morbi malesuada lorem tortor, sed aliquam ante lacus, facilisis
          </p>
        </div>

        <div className="top-themes">
          <h3 className="themes-title">Top Ten Themes</h3>
          <div className="themes-list">
            <div className="theme-item">
              <span className="theme-label">Theme 1:</span>
              <span className="theme-text">
                Aliquam porta nisl dolor, molestie pellentesque elit molestie in. Morbi metus 
                neque, elementum ullamcorper hendrerit eget, tincidunt et nisl.
              </span>
              <span className="theme-percentage">95%</span>
            </div>
            <div className="theme-item">
              <span className="theme-label">Theme 2:</span>
              <span className="theme-text">
                Duis et purus in dolor bibendum egestas vel vitae urna. Vestibulum 
                dictum semper laoreet. Nulla augue tellus, aliquam mollis quam eget, maximus iaculis sem.
              </span>
              <span className="theme-percentage">70%</span>
            </div>
            <div className="theme-item">
              <span className="theme-label">Theme 3:</span>
              <span className="theme-text">
                Integer commodo sapien lacus, nec interdum nisl vehicula aliquam. Aliquam enim lorem, 
                laoreet ut egestas quis, rutrum sed lectus.
              </span>
              <span className="theme-percentage">65%</span>
            </div>
            <div className="theme-item">
              <span className="theme-label">Theme 4:</span>
              <span className="theme-text">
                Praesent semper ex tortor, in rhoncus arcu sollicitudin ut. Donec magna lorem, 
                efficitur quis fringilla sed, imperdiet sed risus.
              </span>
              <span className="theme-percentage">58%</span>
            </div>
            <div className="theme-item">
              <span className="theme-label">Theme 5:</span>
              <span className="theme-text">
                Nam accumsan, elit sit amet pretium commodo, turpis augue molestie eros, quis 
                maximus diam ex eget libero.
              </span>
              <span className="theme-percentage">52%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <AppLayout 
      viewMode="reflection"
      participantCount={participantCount}
      onViewModeChange={() => {}}
      showVideoGrid={false}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onBack={onBack}
      onForward={onForward}
      currentPage={currentPage}
      currentIndex={currentIndex}
      totalPages={totalPages}
      developmentMode={developmentMode}
    >
      {summaryContent}
    </AppLayout>
  );
};

export default NewInsightsPage; 