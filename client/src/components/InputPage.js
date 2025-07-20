import React, { useState } from 'react';
import './InputPage.css';
import {
  directionBackwardOff,
  directionBackwardOn,
  directionBackwardHover,
  directionForwardOff,
  directionForwardOn,
  directionForwardHover
} from '../assets/icons';

const InputPage = ({
  onContinue,
  currentPage,
  currentIndex,
  totalPages,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onNavigate,
  developmentMode
}) => {
  const [parameters, setParameters] = useState({
    host: '',
    gatheringSize: '',
    availableTime: '',
    diversity: '',
    familiarity: '',
    experience: '',
    theme: '',
    context: '',
    catalystPreferences: []
  });

  const [backButtonState, setBackButtonState] = useState('off');
  const [forwardButtonState, setForwardButtonState] = useState('off');

  const handleParameterChange = (field, value) => {
    setParameters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCatalystPreferenceChange = (preference) => {
    setParameters(prev => ({
      ...prev,
      catalystPreferences: prev.catalystPreferences.includes(preference)
        ? prev.catalystPreferences.filter(p => p !== preference)
        : [...prev.catalystPreferences, preference]
    }));
  };



  // Button icon functions
  const getBackButtonIcon = () => {
    switch (backButtonState) {
      case 'on': return directionBackwardOn;
      case 'hover': return directionBackwardHover;
      default: return directionBackwardOff;
    }
  };

  const getForwardButtonIcon = () => {
    switch (forwardButtonState) {
      case 'on': return directionForwardOn;
      case 'hover': return directionForwardHover;
      default: return directionForwardOff;
    }
  };

  const handleBackClick = () => {
    if (canGoBack && onBack) {
      setBackButtonState('on');
      onBack();
      setTimeout(() => setBackButtonState('off'), 200);
    }
  };

  const handleForwardClick = () => {
    if (canGoForward && onForward) {
      setForwardButtonState('on');
      onForward();
      setTimeout(() => setForwardButtonState('off'), 200);
    }
  };

  return (
    <div className="input-page">
      <div className="input-container">
        {/* Header - matching landing page */}
        <header className="input-header">
          <div className="header-content">
            <div className="logo-container">
              <img 
                src="/images/EarthLogoSmallTransparent.png" 
                alt="Generative Dialogue Logo" 
                className="actual-logo"
              />
            </div>
            <div className="title-section">
              <h1 className="main-title">CONFIGURE YOUR DIALOGUE</h1>
            </div>
          </div>
        </header>

        {/* Hero Section - exact same as landing page */}
        <div className="hero-image-container">
          <img 
            src="/images/global-faces-sphere.jpg" 
            alt="Global sphere made of diverse human faces representing worldwide connection" 
            className="hero-image"
          />
          <div className="hero-overlay">
            <h2 className="hero-subtitle">For A New Global WE</h2>
          </div>
        </div>

        <main className="input-main">
          {/* Input Parameters Section */}
          <div className="parameters-section">
            <h2 className="section-title">INPUT PARAMETERS</h2>
            
            <div className="input-grid">
              <div className="input-row">
                <div className="input-group">
                  <input
                    id="host"
                    type="text"
                    value={parameters.host}
                    onChange={(e) => handleParameterChange('host', e.target.value)}
                    className="input-field"
                    placeholder="Host"
                  />
                </div>
                <div className="input-group">
                  <input
                    id="gatheringSize"
                    type="text"
                    value={parameters.gatheringSize}
                    onChange={(e) => handleParameterChange('gatheringSize', e.target.value)}
                    className="input-field"
                    placeholder="Gathering Size"
                  />
                </div>
                <div className="input-group">
                  <input
                    id="availableTime"
                    type="text"
                    value={parameters.availableTime ? parameters.availableTime + ' minutes' : ''}
                    onChange={(e) => handleParameterChange('availableTime', e.target.value.replace(' minutes', ''))}
                    className="input-field"
                    placeholder="Available Time (in minutes)"
                  />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group">
                  <input
                    id="diversity"
                    type="text"
                    value={parameters.diversity}
                    onChange={(e) => handleParameterChange('diversity', e.target.value)}
                    className="input-field"
                    placeholder="Diversity of the Group"
                  />
                </div>
                <div className="input-group">
                  <input
                    id="familiarity"
                    type="text"
                    value={parameters.familiarity}
                    onChange={(e) => handleParameterChange('familiarity', e.target.value)}
                    className="input-field"
                    placeholder="Familiarity"
                  />
                </div>
                <div className="input-group">
                  <input
                    id="experience"
                    type="text"
                    value={parameters.experience}
                    onChange={(e) => handleParameterChange('experience', e.target.value)}
                    className="input-field"
                    placeholder="Experience With Generative Dialogue"
                  />
                </div>
              </div>

              <div className="input-row">
                <div className="input-group input-group-wide">
                  <input
                    id="theme"
                    type="text"
                    value={parameters.theme}
                    onChange={(e) => handleParameterChange('theme', e.target.value)}
                    className="input-field"
                    placeholder="Theme/Issue Being Explored"
                  />
                </div>
                <div className="input-group input-group-wide">
                  <input
                    id="context"
                    type="text"
                    value={parameters.context}
                    onChange={(e) => handleParameterChange('context', e.target.value)}
                    className="input-field"
                    placeholder="Context/Field"
                  />
                </div>
              </div>
            </div>

            {/* Catalyst Preferences */}
            <div className="catalyst-section">
              <h3 className="catalyst-title">Catalyst Preference</h3>
              <div className="catalyst-options">
                {[
                  { id: 'mindfulnessSilence', label: 'Mindfulness/Silence' },
                  { id: 'poetry', label: 'Poetry' },
                  { id: 'quotesReadings', label: 'Quotes/Readings' },
                  { id: 'music', label: 'Music' },
                  { id: 'bodyBreathWork', label: 'Body/Breath Work' }
                ].map((option) => (
                  <div key={option.id} className="catalyst-option">
                    <label className="catalyst-label">
                      <input
                        type="checkbox"
                        checked={parameters.catalystPreferences.includes(option.id)}
                        onChange={() => handleCatalystPreferenceChange(option.id)}
                        className="catalyst-checkbox"
                      />
                      <span className="catalyst-text">{option.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        
        {/* Control Bar Footer - matching other pages exactly */}
        <div className="control-bar">
          <div className="media-controls">
            {/* Empty div for left alignment */}
          </div>
          
          <div className="navigation-controls" style={{display: 'flex'}}>
            <button 
              className="control-button"
              onClick={handleBackClick}
              onMouseEnter={() => canGoBack && setBackButtonState(backButtonState === 'on' ? 'on' : 'hover')}
              onMouseLeave={() => setBackButtonState(backButtonState === 'on' ? 'on' : 'off')}
              disabled={!canGoBack}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                borderRadius: '50%',
                boxShadow: 'none',
                opacity: !canGoBack ? 0.4 : 1,
                cursor: !canGoBack ? 'not-allowed' : 'pointer'
              }}
            >
              <img 
                src={getBackButtonIcon()} 
                alt="Back" 
                style={{width: '34px', height: '34px'}}
              />
            </button>
            <button 
              className="control-button"
              onClick={handleForwardClick}
              onMouseEnter={() => canGoForward && setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'hover')}
              onMouseLeave={() => setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'off')}
              disabled={!canGoForward}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                borderRadius: '50%',
                boxShadow: 'none',
                overflow: 'hidden',
                opacity: !canGoForward ? 0.4 : 1,
                cursor: !canGoForward ? 'not-allowed' : 'pointer'
              }}
            >
              <img 
                src={getForwardButtonIcon()} 
                alt="Forward" 
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block'
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPage; 