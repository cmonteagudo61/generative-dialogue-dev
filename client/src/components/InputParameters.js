import React, { useState, useEffect } from 'react';
import './InputParameters.css';
import {
  directionBackwardOff,
  directionBackwardOn,
  directionBackwardHover,
  directionForwardOff,
  directionForwardOn,
  directionForwardHover
} from '../assets/icons';

function InputParameters({ onBack, onForward, canGoBack, canGoForward, developmentMode }) {
  const [backButtonState, setBackButtonState] = useState('off');
  const [forwardButtonState, setForwardButtonState] = useState('off');
  
  const [formData, setFormData] = useState({
    host: 'Kathleen Smith',
    gatheringSize: 1000,
    availableTime: 90,
    diversity: 'Medium',
    familiarity: 'New',
    experience: 'Some',
    theme: 'Community Engagement',
    context: 'Public Health',
    catalysts: {
      mindfulness: true,
      poetry: true,
      quotes: true,
      music: true,
      bodyBreath: true
    }
  });

  // Load saved data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('dialogueParameters');
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  // Save data whenever form changes
  useEffect(() => {
    localStorage.setItem('dialogueParameters', JSON.stringify(formData));
  }, [formData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCatalystChange = (catalyst) => {
    setFormData(prev => ({
      ...prev,
      catalysts: {
        ...prev.catalysts,
        [catalyst]: !prev.catalysts[catalyst]
      }
    }));
  };

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

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    handleForwardClick();
  };

  return (
    <div className="input-parameters-page">
      <div className="input-parameters-container">
        {/* Header Section - Same as Landing Page */}
        <header className="input-parameters-header">
          <div className="header-content">
            <div className="logo-container">
              <img 
                src="/images/EarthLogoSmallTransparent.png" 
                alt="Generative Dialogue Logo" 
                className="actual-logo"
              />
            </div>
            <h1 className="main-title">GENERATIVE DIALOGUE</h1>
          </div>
        </header>

        {/* Hero Image Section with Sphere */}
        <div className="hero-image-container">
          <img 
            src="/images/global-faces-sphere.jpg" 
            alt="Global sphere made of diverse human faces representing worldwide connection" 
            className="hero-image"
          />
        </div>

        {/* Input Parameters Form Section */}
        <div className="input-parameters-content">
          <div className="form-header">
            <h2 className="parameters-title">Input Parameters</h2>
          </div>

          <form onSubmit={handleSubmit} className="parameters-form">
            <div className="form-row">
              <div className="form-group">
                <label>Host</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => handleInputChange('host', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Gathering Size</label>
                <input
                  type="text"
                  value={formData.gatheringSize.toLocaleString()}
                  onChange={(e) => handleInputChange('gatheringSize', parseInt(e.target.value.replace(/,/g, '')))}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Available Time</label>
                <select
                  value={formData.availableTime}
                  onChange={(e) => handleInputChange('availableTime', parseInt(e.target.value))}
                  className="form-select"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Diversity of the Group</label>
                <select
                  value={formData.diversity}
                  onChange={(e) => handleInputChange('diversity', e.target.value)}
                  className="form-select"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Familiarity</label>
                <select
                  value={formData.familiarity}
                  onChange={(e) => handleInputChange('familiarity', e.target.value)}
                  className="form-select"
                >
                  <option value="New">New</option>
                  <option value="Some">Some</option>
                  <option value="Familiar">Familiar</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Experience With Generative Dialogue</label>
                <select
                  value={formData.experience}
                  onChange={(e) => handleInputChange('experience', e.target.value)}
                  className="form-select"
                >
                  <option value="None">None</option>
                  <option value="Some">Some</option>
                  <option value="Experienced">Experienced</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Theme/Issue Being Explored</label>
                <input
                  type="text"
                  value={formData.theme}
                  onChange={(e) => handleInputChange('theme', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Context/Field</label>
                <input
                  type="text"
                  value={formData.context}
                  onChange={(e) => handleInputChange('context', e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row catalyst-section">
              <div className="form-group">
                <label className="catalyst-label">Catalyst Preference</label>
                <div className="checkbox-group">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.catalysts.mindfulness}
                      onChange={() => handleCatalystChange('mindfulness')}
                    />
                    <span className="custom-checkbox"></span>
                    <span className="checkbox-text">Mindfulness/Silence</span>
                  </label>
                  
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.catalysts.poetry}
                      onChange={() => handleCatalystChange('poetry')}
                    />
                    <span className="custom-checkbox"></span>
                    <span className="checkbox-text">Poetry</span>
                  </label>
                  
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.catalysts.quotes}
                      onChange={() => handleCatalystChange('quotes')}
                    />
                    <span className="custom-checkbox"></span>
                    <span className="checkbox-text">Quotes/Readings</span>
                  </label>
                  
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.catalysts.music}
                      onChange={() => handleCatalystChange('music')}
                    />
                    <span className="custom-checkbox"></span>
                    <span className="checkbox-text">Music</span>
                  </label>
                  
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={formData.catalysts.bodyBreath}
                      onChange={() => handleCatalystChange('bodyBreath')}
                    />
                    <span className="custom-checkbox"></span>
                    <span className="checkbox-text">Body/Breath Work</span>
                  </label>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Development Footer Navigation */}
      {developmentMode && (
        <div className="dev-footer">
          <div className="dev-footer-content">
            <div className="page-info">
              <span className="page-indicator">3/4</span>
            </div>
            <div className="nav-controls">
              {canGoBack && (
                <button 
                  id="back-btn"
                  onClick={handleBackClick}
                  className={`control-button ${backButtonState === 'on' ? 'active' : ''}`}
                  onMouseEnter={() => setBackButtonState('hover')}
                  onMouseLeave={() => setBackButtonState('off')}
                >
                  <img 
                    src={getBackButtonIcon()} 
                    alt="Back" 
                    style={{ width: '24px', height: '24px' }}
                  />
                </button>
              )}
              
              {canGoForward && (
                <button 
                  id="forward-btn"
                  onClick={handleForwardClick}
                  className={`control-button ${forwardButtonState === 'on' ? 'active' : ''}`}
                  onMouseEnter={() => setForwardButtonState('hover')}
                  onMouseLeave={() => setForwardButtonState('off')}
                >
                  <img 
                    src={getForwardButtonIcon()} 
                    alt="Forward" 
                    style={{ width: '24px', height: '24px' }}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InputParameters; 