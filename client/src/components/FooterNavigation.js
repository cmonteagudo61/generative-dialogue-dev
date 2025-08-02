import React, { useState } from 'react';
import './FooterNavigation.css';
import {
  microphoneOn,
  cameraOn,
  dialoguePersonOn,
  thumbsUpOn,
  thumbsDownOn,
  directionBackwardOn,
  directionForwardOn,
  loopOn,
  microphoneOff,
  cameraOff,
  dialoguePersonOff,
  thumbsUpOff,
  thumbsDownOff,
  directionBackwardOff,
  directionForwardOff,
  loopOff,
  loopHover,
  microphoneHover,
  cameraHover,
  dialoguePersonHover,
  thumbsUpHover,
  thumbsDownHover,
  directionBackwardHover,
  directionForwardHover
} from '../assets/icons';

const FooterNavigation = ({
  vote,
  voteState,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  isMuted,
  isCameraOff,
  isInCall,
  onToggleMic,
  onToggleCamera,
  onToggleCall,
  isLoopActive,
  onToggleLoop,
  totalTime,
  segmentTime,
}) => {
  
  const [personHover, setPersonHover] = useState(false);
  const [isMicrophoneHover, setIsMicrophoneHover] = useState(false);
  const [isCameraHover, setIsCameraHover] = useState(false);
  const [isLoopHover, setIsLoopHover] = useState(false);
  const [isThumbsUpHover, setIsThumbsUpHover] = useState(false);
  const [isThumbsDownHover, setIsThumbsDownHover] = useState(false);
  const [isBackHover, setIsBackHover] = useState(false);
  const [isForwardHover, setIsForwardHover] = useState(false);

  const handleCameraClick = () => {
    onToggleCamera();
    setIsCameraHover(false);
  };

  const handleMicClick = () => {
    onToggleMic();
    setIsMicrophoneHover(false);
  };

  const handleCallClick = () => {
    onToggleCall();
    setPersonHover(false);
  };
  
  const handleLoopClick = () => {
    onToggleLoop();
    setIsLoopHover(false);
  };

  const handleVoteUp = () => {
    vote('up');
    setIsThumbsUpHover(false);
  };
  
  const handleVoteDown = () => {
    vote('down');
    setIsThumbsDownHover(false);
  };

  return (
    <div className="footer-bar">
      {/* Left-aligned media controls */}
      <div className="footer-left">
        <button className={`control-button ${!isCameraOff ? 'active' : ''}`} onClick={handleCameraClick} onMouseEnter={() => setIsCameraHover(true)} onMouseLeave={() => setIsCameraHover(false)}>
          <img src={isCameraOff ? (isCameraHover ? cameraHover : cameraOff) : (isCameraHover ? cameraHover : cameraOn)} alt="Camera" />
        </button>
        <button className={`control-button ${!isMuted ? 'active' : ''}`} onClick={handleMicClick} onMouseEnter={() => setIsMicrophoneHover(true)} onMouseLeave={() => setIsMicrophoneHover(false)}>
          <img src={isMuted ? (isMicrophoneHover ? microphoneHover : microphoneOff) : (isMicrophoneHover ? microphoneHover : microphoneOn)} alt="Microphone" />
        </button>
        <button className={`control-button ${isInCall ? 'active' : ''}`} onClick={handleCallClick} onMouseEnter={() => setPersonHover(true)} onMouseLeave={() => setPersonHover(false)}>
          <img src={isInCall ? (personHover ? dialoguePersonHover : dialoguePersonOn) : (personHover ? dialoguePersonHover : dialoguePersonOff)} alt="Call" />
        </button>
        <button className={`control-button ${isLoopActive ? 'active' : ''}`} onClick={handleLoopClick} onMouseEnter={() => setIsLoopHover(true)} onMouseLeave={() => setIsLoopHover(false)}>
          <img src={isLoopActive ? loopOn : (isLoopHover ? loopHover : loopOff)} alt="Loop" />
        </button>
      </div>

      {/* Center-aligned timer */}
      <div className="footer-center">
        <div className="timer-display">
          <div className="timer-label">TOTAL TIME</div>
          <div className="timer-value">{totalTime}</div>
        </div>
        <div className="timer-display">
          <div className="timer-label">SEGMENT TIME</div>
          <div className="timer-value">{segmentTime}</div>
        </div>
      </div>

      {/* Right-aligned navigation and voting controls */}
      <div className="footer-right">
        <button className={`control-button ${voteState === 'up' ? 'active' : ''}`} onClick={handleVoteUp} onMouseEnter={() => setIsThumbsUpHover(true)} onMouseLeave={() => setIsThumbsUpHover(false)}>
            <img src={voteState === 'up' ? thumbsUpOn : (isThumbsUpHover ? thumbsUpHover : thumbsUpOff)} alt="Thumbs Up" />
        </button>
        <button className={`control-button ${voteState === 'down' ? 'active' : ''}`} onClick={handleVoteDown} onMouseEnter={() => setIsThumbsDownHover(true)} onMouseLeave={() => setIsThumbsDownHover(false)}>
            <img src={voteState === 'down' ? thumbsDownOn : (isThumbsDownHover ? thumbsDownHover : thumbsDownOff)} alt="Thumbs Down" />
        </button>
        <button className={`control-button ${canGoBack ? 'active' : ''}`} onClick={onBack} disabled={!canGoBack} onMouseEnter={() => setIsBackHover(true)} onMouseLeave={() => setIsBackHover(false)}>
          <img src={canGoBack ? (isBackHover ? directionBackwardHover : directionBackwardOn) : directionBackwardOff} alt="Back" />
        </button>
        <button className={`control-button ${canGoForward ? 'active' : ''}`} onClick={onForward} disabled={!canGoForward} onMouseEnter={() => setIsForwardHover(true)} onMouseLeave={() => setIsForwardHover(false)}>
          <img src={canGoForward ? (isForwardHover ? directionForwardHover : directionForwardOn) : directionForwardOff} alt="Forward" />
        </button>
      </div>
    </div>
  );
};

export default FooterNavigation;
