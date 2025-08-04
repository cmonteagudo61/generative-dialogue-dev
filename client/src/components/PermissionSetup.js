import React, { useState, useEffect, useRef, useCallback } from 'react';
import './PermissionSetup.css';
import './FooterNavigation.css'; // Import shared footer styles
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
    const { joinRoom } = useVideo();
    
    // Navigation state for development
    const [isBackHover, setIsBackHover] = useState(false);
    const [isForwardHover, setIsForwardHover] = useState(false);

    const updateStatus = (message, type = '') => {
        setStatus({ message, type });
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
            <div className="footer-bar">
                <div className="footer-left" /> {/* Empty placeholder for alignment */}
                <div className="footer-center" /> {/* Empty placeholder for alignment */}
                <div className="footer-right">
                    <button 
                        className={`control-button ${canGoBack ? 'active' : ''}`} 
                        onClick={onBack} 
                        disabled={!canGoBack}
                        onMouseEnter={() => setIsBackHover(true)}
                        onMouseLeave={() => setIsBackHover(false)}
                    >
                        <img src={canGoBack ? (isBackHover ? directionBackwardHover : directionBackwardOn) : directionBackwardOff} alt="Back" />
                    </button>
                    <button 
                        className={`control-button ${canGoForward ? 'active' : ''}`} 
                        onClick={onForward} 
                        disabled={!canGoForward}
                        onMouseEnter={() => setIsForwardHover(true)}
                        onMouseLeave={() => setIsForwardHover(false)}
                    >
                        <img src={canGoForward ? (isForwardHover ? directionForwardHover : directionForwardOn) : directionForwardOff} alt="Forward" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PermissionSetup;
