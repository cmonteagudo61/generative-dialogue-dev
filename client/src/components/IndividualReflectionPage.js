import React, { useState } from 'react';
import AppLayout from './AppLayout';
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
      viewMode="self" // Changed from "reflection" to "self" to show Individual button as active
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