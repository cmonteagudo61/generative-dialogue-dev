import React, { useState, useEffect } from 'react';
import './ParticipantSignIn.css';

const ParticipantSignIn = ({ 
  onSignIn, 
  initialName = '', 
  sessionId = null,
  isHost = false 
}) => {
  const [formData, setFormData] = useState({
    name: initialName,
    email: '',
    organization: '',
    deviceType: 'desktop',
    role: isHost ? 'host' : 'participant'
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-detect device type
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (/iphone|ipod/.test(userAgent)) return 'mobile';
      if (/ipad/.test(userAgent)) return 'tablet';
      if (/android/.test(userAgent)) {
        return /mobile/.test(userAgent) ? 'mobile' : 'tablet';
      }
      return 'desktop';
    };

    setFormData(prev => ({
      ...prev,
      deviceType: detectDevice()
    }));
  }, []);

  // Load saved data from localStorage
  useEffect(() => {
    const savedData = {
      name: localStorage.getItem('gd_participant_name') || initialName,
      email: localStorage.getItem('gd_participant_email') || '',
      organization: localStorage.getItem('gd_participant_org') || ''
    };
    
    setFormData(prev => ({
      ...prev,
      ...savedData
    }));
  }, [initialName]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      // Save to localStorage for future sessions
      localStorage.setItem('gd_participant_name', formData.name.trim());
      if (formData.email) localStorage.setItem('gd_participant_email', formData.email.trim());
      if (formData.organization) localStorage.setItem('gd_participant_org', formData.organization.trim());
      
      // Generate unique participant ID
      const participantId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const participantData = {
        id: participantId,
        name: formData.name.trim(),
        email: formData.email.trim(),
        organization: formData.organization.trim(),
        deviceType: formData.deviceType,
        role: formData.role,
        joinedAt: new Date().toISOString(),
        sessionId: sessionId
      };
      
      // Call parent callback
      await onSignIn(participantData);
      
    } catch (error) {
      console.error('Sign-in error:', error);
      setErrors({ submit: 'Failed to sign in. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const getDeviceIcon = (deviceType) => {
    switch (deviceType) {
      case 'mobile': return '📱';
      case 'tablet': return '📱';
      case 'desktop': return '💻';
      default: return '💻';
    }
  };

  return (
    <div className="participant-signin-container">
      <div className="signin-header">
        <h2>Join the Dialogue</h2>
        <p>Please introduce yourself to get started</p>
        {sessionId && (
          <div className="session-info">
            <span className="session-id">Session: {sessionId.slice(-8)}</span>
            <span className="role-badge">{formData.role}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="signin-form">
        <div className="form-group">
          <label htmlFor="name">
            Name <span className="required">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter your full name"
            className={errors.name ? 'error' : ''}
            disabled={isSubmitting}
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email">
            Email <span className="optional">(optional)</span>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your.email@example.com"
            className={errors.email ? 'error' : ''}
            disabled={isSubmitting}
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="organization">
            Organization <span className="optional">(optional)</span>
          </label>
          <input
            id="organization"
            type="text"
            value={formData.organization}
            onChange={(e) => handleInputChange('organization', e.target.value)}
            placeholder="Your organization or company"
            disabled={isSubmitting}
          />
        </div>

        <div className="device-info">
          <span className="device-label">Device:</span>
          <span className="device-type">
            {getDeviceIcon(formData.deviceType)} {formData.deviceType}
          </span>
        </div>

        {errors.submit && (
          <div className="error-message submit-error">{errors.submit}</div>
        )}

        <button 
          type="submit" 
          className="signin-button"
          disabled={isSubmitting || !formData.name.trim()}
        >
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Joining...
            </>
          ) : (
            `Join as ${formData.role}`
          )}
        </button>
      </form>

      <div className="signin-footer">
        <p className="privacy-note">
          Your information is used only for this dialogue session and is not stored permanently.
        </p>
      </div>
    </div>
  );
};

export default ParticipantSignIn;



