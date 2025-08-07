import React, { useState } from 'react';
import FooterNavigation from './FooterNavigation';
import './InputPage.css';

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
  developmentMode,
  isMuted,
  isCameraOff,
  isInCall,
  onToggleMic,
  onToggleCamera,
  onToggleCall,
  isLoopActive,
  onToggleLoop,
  vote,
  voteState,
  totalTime,
  segmentTime
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

  return (
    <div className="input-page-container">
      {/* Fixed Header */}
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

      {/* Fixed Hero Banner */}
      <div className="hero-image-container fixed-hero">
        <img 
          src="/images/global-faces-sphere.jpg" 
          alt="Global sphere made of diverse human faces representing worldwide connection" 
          className="hero-image"
        />
        <div className="hero-overlay">
          <h2 className="hero-subtitle">For A New Global WE</h2>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="scrollable-content">
        <h2 className="section-title">INPUT PARAMETERS</h2>
        
        <main className="input-main">
          <div className="parameters-section">
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
              </div>

              <div className="input-row">
                <div className="input-group">
                  <input
                    id="availableTime"
                    type="text"
                    value={parameters.availableTime}
                    onChange={(e) => handleParameterChange('availableTime', e.target.value)}
                    className="input-field"
                    placeholder="Available Time (in minutes)"
                  />
                </div>
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
              </div>

              <div className="input-row">
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
                  { id: 'bodyBreathWork', label: 'Body/Breath Work' },
                  { id: 'movementDance', label: 'Movement/Dance' },
                  { id: 'visualArt', label: 'Visual Art' },
                  { id: 'storytelling', label: 'Storytelling' },
                  { id: 'nature', label: 'Nature' },
                  { id: 'ritual', label: 'Ritual' }
                ].map(catalyst => (
                  <label key={catalyst.id} className="catalyst-option">
                    <input
                      type="checkbox"
                      checked={parameters.catalystPreferences.includes(catalyst.id)}
                      onChange={() => handleCatalystPreferenceChange(catalyst.id)}
                    />
                    {catalyst.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Additional content for scrolling demonstration */}
            <div className="additional-content">
              <div style={{ padding: '30px', textAlign: 'center' }}>
                <h3 style={{ color: '#3E4C71', marginBottom: '20px' }}>Ready to Continue?</h3>
                <p style={{ color: '#6B7280', fontSize: '16px', lineHeight: '1.6' }}>
                  Once you've filled in all the parameters above, you can proceed to set up your device permissions 
                  and start your generative dialogue session.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
      
      {/* Fixed Footer */}
      <FooterNavigation
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        onBack={onBack}
        onForward={onForward}
        onNavigate={onNavigate}
        developmentMode={developmentMode}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isInCall={isInCall}
        onToggleMic={onToggleMic}
        onToggleCamera={onToggleCamera}
        onToggleCall={onToggleCall}
        isLoopActive={isLoopActive}
        onToggleLoop={onToggleLoop}
        vote={vote}
        voteState={voteState}
        totalTime={totalTime}
        segmentTime={segmentTime}
      />
    </div>
  );
};

export default InputPage;
