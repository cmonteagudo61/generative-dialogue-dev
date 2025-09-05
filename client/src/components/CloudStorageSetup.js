/**
 * Cloud Storage Setup Component
 * Helps configure Firebase/Google Cloud Storage integration
 */

import React, { useState, useEffect } from 'react';
import cloudStorage from '../services/cloudStorage';
import './CloudStorageSetup.css';

const CloudStorageSetup = ({ onClose }) => {
  const [status, setStatus] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [config, setConfig] = useState({
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  });

  useEffect(() => {
    // Check current status
    setStatus(cloudStorage.getStatus());
  }, []);

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    
    try {
      // Validate config
      const requiredFields = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
      const missingFields = requiredFields.filter(field => !config[field] || config[field].trim() === '');
      
      if (missingFields.length > 0) {
        alert(`❌ Missing required fields: ${missingFields.join(', ')}`);
        return;
      }

      console.log('🚀 Initializing cloud storage with config:', config);
      const success = await cloudStorage.initialize(config);
      
      if (success) {
        setStatus(cloudStorage.getStatus());
        alert('✅ Cloud storage initialized successfully!');
      } else {
        alert('❌ Failed to initialize cloud storage. Check your configuration.');
      }
      
    } catch (error) {
      console.error('Setup error:', error);
      alert('❌ Setup failed: ' + error.message);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSyncToCloud = async () => {
    try {
      await cloudStorage.syncToCloud();
      alert('✅ Data synced to cloud successfully!');
    } catch (error) {
      alert('❌ Sync failed: ' + error.message);
    }
  };

  return (
    <div className="cloud-setup-overlay">
      <div className="cloud-setup-modal">
        <div className="cloud-setup-header">
          <h2>☁️ Cloud Storage Setup</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="cloud-setup-content">
          {/* Status Section */}
          <div className="status-section">
            <h3>Current Status</h3>
            {status && (
              <div className="status-info">
                <div className={`status-item ${status.isInitialized ? 'success' : 'warning'}`}>
                  <span className="status-label">Initialized:</span>
                  <span className="status-value">{status.isInitialized ? '✅ Yes' : '⚠️ No'}</span>
                </div>
                <div className={`status-item ${status.isOnline ? 'success' : 'warning'}`}>
                  <span className="status-label">Online:</span>
                  <span className="status-value">{status.isOnline ? '✅ Yes' : '📱 Local Only'}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Storage:</span>
                  <span className="status-value">{status.storageType}</span>
                </div>
                {status.userId && (
                  <div className="status-item">
                    <span className="status-label">User ID:</span>
                    <span className="status-value">{status.userId.substring(0, 8)}...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Configuration Section */}
          {(!status?.isOnline) && (
            <div className="config-section">
              <h3>Firebase Configuration</h3>
              <p className="config-description">
                To enable cloud storage, you'll need to set up a Firebase project and provide the configuration details.
              </p>
              
              <div className="config-steps">
                <h4>Setup Steps:</h4>
                <ol>
                  <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer">Firebase Console</a></li>
                  <li>Create a new project or select existing</li>
                  <li>Enable Firestore Database</li>
                  <li>Go to Project Settings → General → Your apps</li>
                  <li>Add a web app and copy the config</li>
                  <li>Paste the values below:</li>
                </ol>
              </div>

              <div className="config-form">
                {Object.keys(config).map(key => (
                  <div key={key} className="form-group">
                    <label>{key}:</label>
                    <input
                      type="text"
                      value={config[key]}
                      onChange={(e) => handleConfigChange(key, e.target.value)}
                      placeholder={`Enter ${key}`}
                    />
                  </div>
                ))}
              </div>

              <button 
                className="btn-primary"
                onClick={handleInitialize}
                disabled={isInitializing || !config.apiKey}
              >
                {isInitializing ? '🔄 Initializing...' : '🚀 Initialize Cloud Storage'}
              </button>
            </div>
          )}

          {/* Actions Section */}
          {status?.isOnline && (
            <div className="actions-section">
              <h3>Cloud Storage Actions</h3>
              <div className="action-buttons">
                <button 
                  className="btn-secondary"
                  onClick={handleSyncToCloud}
                >
                  🔄 Sync Local Data to Cloud
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => window.location.reload()}
                >
                  🔄 Reload App
                </button>
              </div>
            </div>
          )}

          {/* Environment Variables Section */}
          <div className="env-section">
            <h3>Environment Variables (Production Setup)</h3>
            <p>For production deployment, set these environment variables:</p>
            <div className="env-vars">
              <code>REACT_APP_FIREBASE_API_KEY</code><br/>
              <code>REACT_APP_FIREBASE_AUTH_DOMAIN</code><br/>
              <code>REACT_APP_FIREBASE_PROJECT_ID</code><br/>
              <code>REACT_APP_FIREBASE_STORAGE_BUCKET</code><br/>
              <code>REACT_APP_FIREBASE_MESSAGING_SENDER_ID</code><br/>
              <code>REACT_APP_FIREBASE_APP_ID</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CloudStorageSetup;
