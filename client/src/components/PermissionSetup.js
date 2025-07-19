import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PermissionSetup.css';
import { useVideo } from './VideoProvider';
import {
  directionBackwardOff,
  directionBackwardOn,
  directionBackwardHover,
  directionForwardOff,
  directionForwardOn,
  directionForwardHover
} from '../assets/icons';

const PermissionSetup = ({ 
  onSetupComplete, 
  developmentMode, 
  canGoBack, 
  canGoForward, 
  onBack, 
  onForward, 
  currentPage 
}) => {
    const [status, setStatus] = useState({ message: 'Ready to begin setup. Click the button below to start.', type: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [setupInProgress, setSetupInProgress] = useState(false);
    const [videoAvailable, setVideoAvailable] = useState(false);
    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);
    
    // Use Daily.co video context
    const { joinRoom, callObject, error: videoError, isConnected } = useVideo();
    
    // Navigation state for development
    const [backButtonState, setBackButtonState] = useState('off');
    const [forwardButtonState, setForwardButtonState] = useState('off');

    const updateStatus = (message, type = '') => {
        setStatus({ message, type });
    };

    // Navigation functions for development
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

    const startSetup = useCallback(async () => {
        if (setupInProgress) return;

        setSetupInProgress(true);
        updateStatus('Setting up camera and microphone...', '');
        setIsLoading(true);

        try {
            console.log('🎥 SIMPLIFIED APPROACH - Starting getUserMedia video setup...');
            updateStatus('Accessing camera and microphone...', '');
            
            // First, get user media directly for immediate preview
            const userMediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: true, 
                audio: true 
            });
            
            console.log('🎥 SUCCESS - Got user media stream:', userMediaStream);
            updateStatus('Video stream acquired, setting up preview...', '');
            
            if (videoRef.current) {
                videoRef.current.srcObject = userMediaStream;
                mediaStreamRef.current = userMediaStream;
                setVideoAvailable(true);
                
                // Ensure video plays and is visible
                try {
                    await videoRef.current.play();
                    console.log('🎥 SUCCESS - Video preview set and playing successfully');
                    updateStatus('Video preview is now active!', 'success');
                } catch (playError) {
                    console.log('🎥 Video autoplay blocked, but stream is set:', playError);
                    updateStatus('Video stream ready (click to play if needed)', 'success');
                }
            }

            // Now try to connect to Daily.co in the background for the next page
            const demoRoomUrl = 'https://generativedialogue.daily.co/ReactRoom';
            
            if (joinRoom) {
                console.log('🎥 Connecting to Daily.co room in background...');
                try {
                    await joinRoom(demoRoomUrl);
                    console.log('🎥 Successfully connected to Daily.co');
                } catch (dailyError) {
                    console.warn('🎥 Daily.co connection failed, but preview still works:', dailyError);
                }
            }

            const deviceInfo = {
                videoEnabled: true,
                audioEnabled: true,
                videoDeviceId: 'user-media-video',
                audioDeviceId: 'user-media-audio',
                videoLabel: 'Camera',
                audioLabel: 'Microphone',
                dailyConnected: true,
                roomUrl: demoRoomUrl
            };

            // Store device info
            localStorage.setItem('dialogueDeviceInfo', JSON.stringify(deviceInfo));

            setIsSetupComplete(true);
            updateStatus('Camera and microphone are ready!', 'success');
            setIsLoading(false);

        } catch (error) {
            console.error('🎥 Video setup error:', error);
            let errorMessage = 'Could not access camera and microphone.';

            if (error.name === 'NotAllowedError') {
                errorMessage = 'Camera and microphone access denied. Please allow access and try again.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera or microphone found. Please check your devices.';
            } else if (error.message) {
                errorMessage = error.message;
            }

            updateStatus(`Error: ${errorMessage}`, 'error');
            setIsLoading(false);
            setSetupInProgress(false);
        }
    }, [joinRoom, setupInProgress]);

    const proceedToDialogue = () => {
        if (!isSetupComplete) {
            updateStatus('Setup not complete. Please try again.', 'error');
            return;
        }

        // Stop all tracks to release the camera
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }

        // Call the parent callback to proceed to the main app
        if (onSetupComplete) {
            onSetupComplete();
        }
    };

    // Auto-start setup when component loads
    useEffect(() => {
        // Automatically start setup when the component loads
        console.log('🎥 Auto-start effect triggered:', {
            setupInProgress,
            isSetupComplete,
            joinRoom: !!joinRoom
        });
        
        if (!setupInProgress && !isSetupComplete && joinRoom) {
            console.log('🎥 NEW CODE - Starting auto-setup in 500ms...');
            const timer = setTimeout(() => {
                console.log('🎥 NEW CODE - Auto-setup timer triggered, calling startSetup');
                startSetup();
            }, 500); // Quick start for immediate preview
            
            return () => clearTimeout(timer);
        }
    }, [joinRoom, setupInProgress, isSetupComplete, startSetup]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="permission-setup">
            <div className="setup-container">
                <div className="logo-container">
                    <img 
                        src="./images/EarthLogoSmallTransparent.png" 
                        alt="Generative Dialogue Logo" 
                        className="logo"
                    />
                </div>

                <h1>Welcome to Generative Dialogue</h1>

                <p>Before joining the dialogue, let's set up your camera and microphone to ensure everything works properly.</p>

                <div className={`status-container ${status.type}`}>
                    {status.message}
                </div>

                <div className="video-preview">
                    <video 
                        ref={videoRef}
                        autoPlay 
                        muted 
                        playsInline
                        className="preview-video"
                    />
                    {!videoAvailable && (
                        <div className="video-placeholder">
                            <div className="placeholder-text">Video preview will appear here</div>
                        </div>
                    )}
                </div>

                {isLoading && (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <div className="spinner-text">Setting up your connection...</div>
                    </div>
                )}

                <button 
                    className="btn"
                    onClick={isSetupComplete ? proceedToDialogue : startSetup}
                    disabled={setupInProgress && !isSetupComplete}
                >
                    <img 
                        src="/src/assets/icons/camera-on.svg" 
                        alt="Camera" 
                        className="btn-icon"
                    />
                    {isSetupComplete ? 'Continue to Dialogue' : 'Set Up Camera & Microphone'}
                </button>
            </div>

            {/* Development Navigation Footer */}
            {developmentMode && (
                <div className="dev-footer">
                    <div className="dev-footer-content">
                        <div className="page-info">
                            <span className="page-indicator">Permission Setup (2/4)</span>
                        </div>
                        <div className="nav-controls">
                            <button 
                                id="back-btn" 
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
                                id="forward-btn" 
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
            )}
        </div>
    );
};

export default PermissionSetup; 