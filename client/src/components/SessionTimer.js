import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SessionTimer.css';

const SessionTimer = ({
  duration = 0, // Duration in seconds
  isRunning = false,
  onComplete = () => {},
  onTimeUpdate = () => {},
  phase = 'Connect',
  subphase = 'Catalyst',
  showPhaseInfo = true,
  autoAdvance = false,
  onPhaseAdvance = () => {}
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isActive, setIsActive] = useState(isRunning);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize timer when duration changes
  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);

  // Handle running state changes
  useEffect(() => {
    setIsActive(isRunning);
    if (!isRunning) {
      setIsPaused(false);
    }
  }, [isRunning]);

  // Timer logic
  useEffect(() => {
    if (isActive && !isPaused && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          onTimeUpdate(newTime);
          
          // Play warning sounds
          if (newTime === 60) {
            playWarningSound('minute');
          } else if (newTime === 30) {
            playWarningSound('thirty');
          } else if (newTime <= 10 && newTime > 0) {
            playWarningSound('countdown');
          }
          
          // Handle completion
          if (newTime <= 0) {
            playWarningSound('complete');
            setIsActive(false);
            onComplete();
            
            if (autoAdvance) {
              setTimeout(() => onPhaseAdvance(), 2000);
            }
            
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, timeRemaining, onComplete, onTimeUpdate, autoAdvance, onPhaseAdvance, playWarningSound]);

  const playWarningSound = useCallback((type) => {
    // Create audio context for different warning sounds
    if (!audioRef.current) {
      audioRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const ctx = audioRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Different tones for different warnings
    switch (type) {
      case 'minute':
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.2);
        break;
      case 'thirty':
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.3);
        break;
      case 'countdown':
        oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
        break;
      case 'complete':
        // Play a pleasant completion chime
        [523, 659, 784].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.2);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.2);
          osc.start(ctx.currentTime + i * 0.2);
          osc.stop(ctx.currentTime + i * 0.2 + 0.3);
        });
        break;
      default:
        break;
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isActive) {
      setIsPaused(!isPaused);
    }
  }, [isActive, isPaused]);

  const handleReset = useCallback(() => {
    setTimeRemaining(duration);
    setIsActive(false);
    setIsPaused(false);
  }, [duration]);

  const handleAddTime = useCallback((minutes) => {
    setTimeRemaining(prev => prev + (minutes * 60));
  }, []);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;

  // Determine timer state for styling
  const getTimerState = () => {
    if (timeRemaining <= 0) return 'complete';
    if (timeRemaining <= 30) return 'critical';
    if (timeRemaining <= 60) return 'warning';
    return 'normal';
  };

  const timerState = getTimerState();

  return (
    <div className={`session-timer ${timerState} ${isActive ? 'active' : ''} ${isPaused ? 'paused' : ''}`}>
      {showPhaseInfo && (
        <div className="phase-info">
          <div className="phase-name">{phase}</div>
          <div className="subphase-name">{subphase}</div>
        </div>
      )}
      
      <div className="timer-display">
        <div className="time-remaining">
          {formatTime(timeRemaining)}
        </div>
        
        <div className="progress-ring">
          <svg className="progress-svg" viewBox="0 0 100 100">
            <circle
              className="progress-background"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              className="progress-bar"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - progressPercentage / 100)}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
        </div>
      </div>

      <div className="timer-controls">
        <button 
          className="timer-btn play-pause"
          onClick={handlePlayPause}
          disabled={timeRemaining <= 0}
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>
        
        <button 
          className="timer-btn reset"
          onClick={handleReset}
          title="Reset Timer"
        >
          🔄
        </button>
        
        <div className="time-adjust">
          <button 
            className="timer-btn add-time"
            onClick={() => handleAddTime(1)}
            title="Add 1 minute"
          >
            +1m
          </button>
          <button 
            className="timer-btn add-time"
            onClick={() => handleAddTime(5)}
            title="Add 5 minutes"
          >
            +5m
          </button>
        </div>
      </div>

      {timeRemaining <= 0 && (
        <div className="completion-message">
          <div className="completion-text">🎉 Phase Complete!</div>
          {autoAdvance && (
            <div className="auto-advance-notice">
              Auto-advancing in 2 seconds...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SessionTimer;
