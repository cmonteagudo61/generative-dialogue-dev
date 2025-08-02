import React, { useMemo } from 'react';

import { useVideo } from './VideoProvider';

const OurStoryPage = ({ 
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
    <div className="ourstory-container">
      <div className="ourstory-header">
        <div className="header-titles">
          <h1 className="ourstory-title">AI WE Summary</h1>
          <h2 className="ourstory-subtitle">What is OUR Emerging Story Over Time?</h2>
        </div>
      </div>
      
      <div className="ourstory-content">
        <div className="ourstory-text">
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

        <div className="ai-summary-section">
          <h3 className="ai-summary-title">AI WE Summary</h3>
          <div className="ai-explanation">
            <p>
              The AI technology can serve in a particular way as a collective summary and archive by 
              highlighting and storing emerging themes.
            </p>
            <p>
              AI will provide us with the top ten themes that <strong>connect</strong> us at this stage.
            </p>
            <div className="then-divider">
              <span>THEN</span>
            </div>
            <p>
              AI will provide us with the top ten themes that <strong>divide</strong> us at this stage
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return summaryContent;
};

export default OurStoryPage;
