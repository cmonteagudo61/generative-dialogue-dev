import React from 'react';
import AppLayout from './AppLayout';
import './QuestionsPage.css';

const QuestionsPage = ({ 
  canGoBack,
  canGoForward, 
  onBack,
  onForward,
  currentPage,
  currentIndex,
  totalPages,
  developmentMode
}) => {

  const summaryContent = (
    <div className="questions-container">
      <div className="questions-header">
        <div className="header-titles">
          <h1 className="questions-title">AI WE Summary</h1>
          <h2 className="questions-subtitle">What Questions do WE Hold?</h2>
        </div>
      </div>
      
      <div className="questions-content">
        <div className="questions-text">
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

export default QuestionsPage; 