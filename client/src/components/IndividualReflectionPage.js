import React, { useState, useMemo } from 'react';
import AppLayout from './AppLayout';
import { useVideo } from './VideoProvider';
import './IndividualReflectionPage.css';

  const IndividualReflectionPage = ({ 
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
  const [activeView, setActiveView] = useState('1'); // Self view (1 person)
  
  // Get participant count from VideoProvider
  const { realParticipants } = useVideo();
  const participantCount = useMemo(() => {
    // For demo purposes, show a fixed count if no real participants
    return realParticipants.length > 0 ? realParticipants.length : 1093;
  }, [realParticipants]);

  const handleViewChange = (newView) => setActiveView(newView);

  // State for individual responses
  const [responses, setResponses] = useState({
    question1: '',
    question2: '',
    question3: '',
    question4: '',
    question5: '',
    question6: '',
    question7: ''
  });

  // Host-configurable questions (for now mocked, later will come from dashboard/database)
  const [hostQuestions] = useState([
    'What connects us?',
    'What still divides us?',
    'What is one important insight from today?',
    'What question do you still hold?',
    'What do you need to talk about?',
    'What are you ready to talk about?',
    'What story is emerging?'
  ]);

  const handleInputChange = (questionIndex, value) => {
    setResponses(prev => ({
      ...prev,
      [`question${questionIndex + 1}`]: value
    }));
  };

  const reflectionContent = (
    <div className="individual-reflection-container">
      <div className="reflection-header">
        <h1 className="hero-subtitle">INDIVIDUAL REFLECTION</h1>
      </div>
      
      <div className="reflection-form">
        {hostQuestions.map((question, index) => (
          <textarea
            key={index}
            className="reflection-input"
            placeholder={question}
            value={responses[`question${index + 1}`]}
            onChange={(e) => handleInputChange(index, e.target.value)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <AppLayout
      activeSize={activeView}
      onSizeChange={handleViewChange}
      viewMode="reflection" // Display "INDIVIDUAL REFLECTION" as single line header
      participantCount={participantCount}
      canGoBack={canGoBack}
      canGoForward={canGoForward}
      onBack={onBack}
      onForward={onForward}
      currentPage={currentPage}
      currentIndex={currentIndex}
      totalPages={totalPages}
      developmentMode={developmentMode}
    >
      {reflectionContent}
    </AppLayout>
  );
};

export default IndividualReflectionPage; 