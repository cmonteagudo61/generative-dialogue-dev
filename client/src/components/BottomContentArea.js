import React, { useState, useEffect } from 'react';
import './BottomContentArea.css';
import EnhancedTranscription from './EnhancedTranscription';
import {
  microphoneOff,
  microphoneOn,
  microphoneHover,
  cameraOff,
  cameraOn,
  cameraHover,
  dialoguePersonOff,
  dialoguePersonOn,
  dialoguePersonHover,
  thumbsUpOff,
  thumbsUpOn,
  thumbsUpHover,
  thumbsDownOff,
  thumbsDownOn,
  thumbsDownHover,
  directionBackwardOff,
  directionBackwardOn,
  directionBackwardHover,
  directionForwardOff,
  directionForwardOn,
  directionForwardHover,
  loopOn,
  loopHover
} from '../assets/icons';

const BottomContentArea = ({ 
  participantCount = 1093, 
  onLoopToggle,
  developmentMode,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  currentPage
}) => {
  const [activeTab, setActiveTab] = useState('catalyst');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isInCall, setIsInCall] = useState(true);
  const [totalTime, setTotalTime] = useState('01:30:00');
  const [segmentTime, setSegmentTime] = useState('00:00');
  const [voteState, setVoteState] = useState(null); // 'up', 'down', or null
  const [backButtonState, setBackButtonState] = useState('off'); // 'off', 'hover', 'on'
  const [forwardButtonState, setForwardButtonState] = useState('off'); // 'off', 'hover', 'on'
  const [personHover, setPersonHover] = useState(false);
  const [isMicrophoneHover, setIsMicrophoneHover] = useState(false);
  const [isCameraHover, setIsCameraHover] = useState(false);
  const [isLoopActive, setIsLoopActive] = useState(false);
  const [isLoopHover, setIsLoopHover] = useState(false);

  // Transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionStatus, setTranscriptionStatus] = useState('Disconnected');
  const [transcriptionError, setTranscriptionError] = useState('');

  // Timer effect for segment time
  useEffect(() => {
    const interval = setInterval(() => {
      setSegmentTime(prevTime => {
        const [minutes, seconds] = prevTime.split(':').map(Number);
        const totalSeconds = minutes * 60 + seconds + 1;
        const newMinutes = Math.floor(totalSeconds / 60);
        const newSeconds = totalSeconds % 60;
        return `${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Transcription functions - these will be passed to EnhancedTranscription
  const startRecording = () => {
    setIsRecording(true);
    setTranscriptionStatus('Connected - Speaking...');
  };

  const stopRecording = () => {
    setIsRecording(false);
    setTranscriptionStatus('Disconnected');
  };

  const clearTranscription = () => {
    // This will be handled by EnhancedTranscription
    setTranscriptionStatus('Cleared');
  };

  const getStatusClass = () => {
    if (transcriptionError) return 'disconnected';
    if (isRecording) return 'recording';
    if (transcriptionStatus.includes('Connected')) return 'connected';
    return 'disconnected';
  };

  const switchTab = (tabName) => {
    setActiveTab(tabName);
  };

  const toggleMic = () => {
    setIsMuted(!isMuted);
    setIsMicrophoneHover(false); // Reset hover state after click
  };

  const toggleCamera = () => {
    setIsCameraOff(!isCameraOff);
    setIsCameraHover(false); // Reset hover state after click
  };

  const toggleCall = () => {
    setIsInCall(!isInCall);
    setPersonHover(false); // Reset hover state after click
  };

  const toggleLoop = () => {
    const newLoopState = !isLoopActive;
    console.log(`🔄 LOOP TOGGLE: ${isLoopActive} → ${newLoopState}`);
    setIsLoopActive(newLoopState);
    setIsLoopHover(false); // Reset hover state after click
    if (onLoopToggle) {
      console.log(`📡 CALLING onLoopToggle with: ${newLoopState}`);
      onLoopToggle(newLoopState);
    } else {
      console.log('❌ onLoopToggle callback not provided');
    }
  };

  const vote = (direction) => {
    console.log(`Voted ${direction}`);
    // Toggle vote state - if same direction, remove vote, otherwise set new vote
    setVoteState(voteState === direction ? null : direction);
  };

  const handleBackClick = () => {
    if (developmentMode && canGoBack && onBack) {
      // Development mode: navigate to previous page
      setBackButtonState('on');
      onBack();
      setTimeout(() => setBackButtonState('off'), 200);
    } else {
      // Normal mode: toggle button state
      console.log('Back button clicked');
      const newBackState = backButtonState === 'on' ? 'off' : 'on';
      setBackButtonState(newBackState);
      
      if (newBackState === 'on') {
        setForwardButtonState('off');
      }
    }
  };

  const handleForwardClick = () => {
    if (developmentMode && canGoForward && onForward) {
      // Development mode: navigate to next page
      setForwardButtonState('on');
      onForward();
      setTimeout(() => setForwardButtonState('off'), 200);
    } else {
      // Normal mode: toggle button state
      console.log('Forward button clicked');
      const newForwardState = forwardButtonState === 'on' ? 'off' : 'on';
      setForwardButtonState(newForwardState);
      
      if (newForwardState === 'on') {
        setBackButtonState('off');
      }
    }
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

  return (
    <div className="bottom-content-area">
      {/* Tab area */}
      <div className="tab-area">
        <div className="tab-navigation">
          <div className="tab-controls-left">
            <div 
              className={`tab-btn ${activeTab === 'catalyst' ? 'active' : ''}`}
              onClick={() => switchTab('catalyst')}
            >
              Catalyst
            </div>
            <div 
              className={`tab-btn ${activeTab === 'dialogue' ? 'active' : ''}`}
              onClick={() => switchTab('dialogue')}
            >
              Dialogue
            </div>
            <div 
              className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => switchTab('summary')}
            >
              Summary
            </div>
            <div 
              className={`tab-btn ${activeTab === 'we' ? 'active' : ''}`}
              onClick={() => switchTab('we')}
            >
              WE
            </div>
          </div>
          
          {/* Transcription Controls */}
          <div className="tab-controls-right">
            <button 
              className={`transcription-control-btn ${isRecording ? 'danger' : 'primary'}`}
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? '⏹ Stop Recording' : '🎤 Start Live Transcription'}
            </button>
            
            <button 
              className="transcription-control-btn warning"
              onClick={clearTranscription}
            >
              🗑 Clear
            </button>
            
            <div className={`transcription-status ${getStatusClass()}`}>
              {transcriptionError || transcriptionStatus}
            </div>
          </div>
        </div>
        
        <div className="tab-content">
          {/* Catalyst Content */}
          {activeTab === 'catalyst' && (
            <div id="catalystContent" className="content-section">
              <div className="dialogue-section">
                <h3 className="dialogue-title">Dialogue Session Orientation</h3>
                <p>Welcome! In today's Generative Dialogue we have chosen to meet for <strong>90 minutes</strong> on the subject of <strong>Community Engagement</strong>. There are <strong>{participantCount} participants</strong> present. Our gathering hosts today are <strong>Danny Martin and Carlos Monteagudo</strong>.</p>
                
                <p>As we become familiar with Generative Dialogue we will learn how the overall arc of dialogue can create the conditions for deeper connection and collective intelligence to emerge.</p>
                
                <div className="dialogue-instructions">
                  <h4>Dyad Dialogue Guide</h4>
                  <p>In this next section, you will have a total of 10 minutes to share with each other what came up for you during the mindfulness exercise.</p>
                  
                  <p>The 10 minutes will allow the two participants to share as follows:</p>
                  <ol>
                    <li>Go in sequence (4 mins each)</li>
                    <li>No interruption</li>
                    <li>Listen with full presence</li>
                    <li>Notice what resonates</li>
                  </ol>
                </div>
                
                <div className="guiding-question">
                  <strong>Guiding Question:</strong> What personal experiences have shaped your perspective on this topic?
                </div>
              </div>
            </div>
          )}
          
          {/* Dialogue Content - Enhanced Real-time Transcription */}
          {activeTab === 'dialogue' && (
            <div id="dialogueContent" className="content-section dialogue-tab-content">
              <EnhancedTranscription 
                isRecording={isRecording}
                startRecording={startRecording}
                stopRecording={stopRecording}
                clearTranscription={clearTranscription}
                getStatusClass={getStatusClass}
              />
            </div>
          )}
          
          {/* Summary Content */}
          {activeTab === 'summary' && (
            <div id="summaryContent" className="content-section">
              <div className="summary-card">
                <div className="summary-header">
                  <div className="summary-title">Key Themes Emerging</div>
                  <div className="ai-tag">AI Generated</div>
                </div>
                
                <div className="summary-content">
                  <p>The conversation centers on the concept of intergenerational responsibility and long-term thinking. Both speakers recognize the value of indigenous approaches to decision-making that consider impacts many generations into the future.</p>
                  
                  <p>There's an acknowledgment that current systems often lack this perspective, and there's interest in exploring how to incorporate this long-term, multigenerational viewpoint into modern governance structures.</p>
                </div>
                
                <div className="vote-controls">
                  <span>Is this accurate?</span>
                  <button 
                    className={`vote-btn ${voteState === 'up' ? 'active' : ''}`} 
                    onClick={() => vote('up')}
                    onMouseEnter={(e) => e.target.querySelector('img').src = thumbsUpHover}
                    onMouseLeave={(e) => e.target.querySelector('img').src = voteState === 'up' ? thumbsUpOn : thumbsUpOff}
                  >
                    <img src={voteState === 'up' ? thumbsUpOn : thumbsUpOff} alt="Thumbs Up" style={{width: '24px', height: '24px'}} /> 24
                  </button>
                  <button 
                    className={`vote-btn ${voteState === 'down' ? 'active' : ''}`} 
                    onClick={() => vote('down')}
                    onMouseEnter={(e) => e.target.querySelector('img').src = thumbsDownHover}
                    onMouseLeave={(e) => e.target.querySelector('img').src = voteState === 'down' ? thumbsDownOn : thumbsDownOff}
                  >
                    <img src={voteState === 'down' ? thumbsDownOn : thumbsDownOff} alt="Thumbs Down" style={{width: '24px', height: '24px'}} /> 3
                  </button>
                </div>
              </div>
              
              <div className="summary-card">
                <div className="summary-header">
                  <div className="summary-title">Formatted Transcript</div>
                  <div className="ai-tag">AI Enhanced</div>
                </div>
                
                <div className="summary-content">
                  <p><strong>Sarah Johnson:</strong> I think we need to consider how our actions today will impact future generations.</p>
                  
                  <p><strong>Michael Chen:</strong> That's an interesting point. I've been thinking about how indigenous cultures often make decisions based on the impact seven generations ahead.</p>
                  
                  <p><strong>Sarah Johnson:</strong> Exactly! That kind of long-term thinking seems missing from many of our current systems.</p>
                  
                  <p><strong>Michael Chen:</strong> I wonder if there are ways we could incorporate that perspective into our governance models?</p>
                </div>
              </div>
            </div>
          )}
          
          {/* WE Content */}
          {activeTab === 'we' && (
            <div id="weContent" className="content-section">
              <h3 className="dialogue-title">Voices From The Field</h3>
              
              <div className="voice-card">
                <div className="voice-speaker">Sarah Johnson</div>
                <div className="voice-quote">"I was struck by how many of us referenced indigenous wisdom traditions as models for long-term thinking. There seems to be a collective yearning to reconnect with these deeper ways of seeing ourselves in relationship to future generations."</div>
              </div>
              
              <div className="voice-card">
                <div className="voice-speaker">Michael Chen</div>
                <div className="voice-quote">"Our breakout group discussed how governance structures might be redesigned to include representatives for future generations - I'm curious if other groups explored similar ideas."</div>
              </div>
              
              <div className="voice-card">
                <div className="voice-speaker">Aisha Patel</div>
                <div className="voice-quote">"We explored the tension between short-term economic incentives and long-term ecological health. Several of us wondered what economic models might better align with intergenerational thinking."</div>
              </div>
              
              <div className="theme-tags">
                <h4>Emerging Themes</h4>
                <div>
                  <span className="theme-tag">intergenerationalEthics</span>
                  <span className="theme-tag">indigenousWisdom</span>
                  <span className="theme-tag">governanceReform</span>
                  <span className="theme-tag">economicReimagining</span>
                  <span className="theme-tag">ecologicalAwareness</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Control bar */}
      <div className="control-bar">
        {/* Media controls */}
        <div style={{display: 'flex'}}>
          <button 
            id="camera-btn" 
            className="control-button"
            onClick={toggleCamera}
            onMouseEnter={() => setIsCameraHover(true)}
            onMouseLeave={() => setIsCameraHover(false)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          >
            <img 
              src={isCameraOff 
                ? (isCameraHover ? cameraHover : cameraOff)
                : (isCameraHover ? cameraHover : cameraOn)
              } /* Updated hover logic */
              alt="Camera" 
              style={{
                width: '24px', 
                height: '24px',
                display: 'block',
                objectFit: 'contain',
                objectPosition: 'center',
                verticalAlign: 'top'
              }}
            />
          </button>
          <button 
            id="mic-btn" 
            className="control-button"
            onClick={toggleMic}
            onMouseEnter={() => setIsMicrophoneHover(true)}
            onMouseLeave={() => setIsMicrophoneHover(false)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          >
            <img 
              src={isMuted 
                ? (isMicrophoneHover ? microphoneHover : microphoneOff)
                : (isMicrophoneHover ? microphoneHover : microphoneOn)
              }
              alt="Microphone" 
              style={{
                width: '28px', 
                height: '28px',
                display: 'block',
                objectFit: 'contain',
                objectPosition: 'center',
                verticalAlign: 'top',
                position: 'relative',
                top: isMuted ? '-1px' : '0px'
              }}
            />
          </button>
          <button 
            id="join-btn" 
            className={`control-button ${isInCall ? 'active' : ''}`}
            onClick={toggleCall}
            onMouseEnter={() => setPersonHover(true)}
            onMouseLeave={() => setPersonHover(false)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          > {/* Person button with new logic */}
            <img 
              src={isInCall 
                ? (personHover ? dialoguePersonHover : dialoguePersonOn)
                : (personHover ? dialoguePersonHover : dialoguePersonOff)
              }
              alt={isInCall ? 'Leave Call' : 'Join Call'}
              style={{
                width: '29px', 
                height: '29px',
                display: 'block',
                objectFit: 'contain',
                objectPosition: 'center',
                verticalAlign: 'top',
                position: 'relative',
                top: '1px'
              }}
            />
          </button>
          <button 
            id="loop-btn" 
            className={`control-button ${isLoopActive ? 'active' : ''}`}
            onClick={toggleLoop}
            onMouseEnter={() => setIsLoopHover(true)}
            onMouseLeave={() => setIsLoopHover(false)}
            style={{
              backgroundColor: '#e0e0e3', // Match footer background  
              border: 'none',
              outline: 'none' // Remove focus ring
            }}
          >
            <img 
              src={isLoopActive 
                ? loopHover  // Always show blue with orange handle when active
                : (isLoopHover ? loopHover : loopOn)
              }
              alt={isLoopActive ? 'Disable Loop' : 'Enable Loop'}
              style={{width: '24px', height: '24px'}}
            />
          </button>
        </div>
        
        {/* Timer display */}
        <div className="timer-display">
          <div className="timer-cell">
            <div className="timer-label">TOTAL TIME</div>
            <div className="timer-value" id="total-time">{totalTime}</div>
          </div>
          <div className="timer-cell">
            <div className="timer-label">SEGMENT TIME</div>
            <div className="timer-value" id="segment-time">{segmentTime}</div>
          </div>
        </div>
        
        {/* Navigation controls */}
        <div style={{display: 'flex'}}>
          <button 
            id="back-btn" 
            className="control-button"
            onClick={handleBackClick}
            onMouseEnter={() => (!developmentMode || canGoBack) && setBackButtonState(backButtonState === 'on' ? 'on' : 'hover')}
            onMouseLeave={() => setBackButtonState(backButtonState === 'on' ? 'on' : 'off')}
            disabled={developmentMode && !canGoBack}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              borderRadius: '50%',
              boxShadow: 'none',
              opacity: (developmentMode && !canGoBack) ? 0.4 : 1,
              cursor: (developmentMode && !canGoBack) ? 'not-allowed' : 'pointer'
            }}
          >
            <img 
              src={getBackButtonIcon()} 
              alt="Back" 
              style={{width: '34px', height: '34px'}}
            />
          </button>
          <button 
            id="forward-btn" 
            className="control-button"
            onClick={handleForwardClick}
            onMouseEnter={() => (!developmentMode || canGoForward) && setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'hover')}
            onMouseLeave={() => setForwardButtonState(forwardButtonState === 'on' ? 'on' : 'off')}
            disabled={developmentMode && !canGoForward}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              borderRadius: '50%',
              boxShadow: 'none',
              overflow: 'hidden',
              opacity: (developmentMode && !canGoForward) ? 0.4 : 1,
              cursor: (developmentMode && !canGoForward) ? 'not-allowed' : 'pointer'
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
  );
};

export default BottomContentArea; 