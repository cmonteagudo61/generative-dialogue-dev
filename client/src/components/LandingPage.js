import React, { useState, useEffect, useRef } from 'react';
import './LandingPage.css';

const LandingPage = ({ onSetupComplete }) => {
    const [status, setStatus] = useState({ message: 'Ready to begin setup. Click the button below to start.', type: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [setupInProgress, setSetupInProgress] = useState(false);
    const videoRef = useRef(null);
    const mediaStreamRef = useRef(null);

    const updateStatus = (message, type = '') => {
        setStatus({ message, type });
    };

    const startSetup = async () => {
        if (setupInProgress) return;

        setSetupInProgress(true);
        updateStatus('Requesting camera and microphone access...', '');
        setIsLoading(true);

        try {
            // Request camera and microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });

            mediaStreamRef.current = stream;

            // Display video preview
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Get device information
            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();

            const deviceInfo = {
                videoEnabled: videoTracks.length > 0,
                audioEnabled: audioTracks.length > 0,
                videoDeviceId: videoTracks.length > 0 ? videoTracks[0].id : null,
                audioDeviceId: audioTracks.length > 0 ? audioTracks[0].id : null,
                videoLabel: videoTracks.length > 0 ? videoTracks[0].label : null,
                audioLabel: audioTracks.length > 0 ? audioTracks[0].label : null
            };

            // Store device info
            localStorage.setItem('dialogueDeviceInfo', JSON.stringify(deviceInfo));

            setIsSetupComplete(true);
            updateStatus('Camera and microphone are ready!', 'success');
            setIsLoading(false);

        } catch (error) {
            console.error('Media access error:', error);
            let errorMessage = 'Could not access camera or microphone.';

            if (error.name === 'NotAllowedError') {
                errorMessage = 'Permission denied. Please allow camera and microphone access.';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'No camera or microphone found on your device.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Camera or microphone is already in use by another application.';
            }

            updateStatus(`Error: ${errorMessage}`, 'error');
            setIsLoading(false);
            setSetupInProgress(false);
        }
    };

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

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaStreamRef.current) {
                mediaStreamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return (
        <div className="landing-page">
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
                    {!mediaStreamRef.current && (
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
        </div>
    );
};

export default LandingPage; 