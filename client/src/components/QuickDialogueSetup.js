import React, { useState, useMemo } from 'react';
import './QuickDialogueSetup.css';

const QuickDialogueSetup = ({ 
  onCreateDialogue, 
  onClose, 
  onAdvancedSetup, 
  initialParticipantCount = 20,
  suggestedRoomType = null,
  constrainedTimeMinutes = null 
}) => {
  const [participantCount, setParticipantCount] = useState(initialParticipantCount);
  
  // Determine initial time slot based on constraint
  const getInitialTimeSlot = () => {
    if (!constrainedTimeMinutes) return '2-hours'; // Default
    
    if (constrainedTimeMinutes <= 60) return '60-min';
    if (constrainedTimeMinutes <= 90) return '90-min';
    if (constrainedTimeMinutes <= 120) return '2-hours';
    if (constrainedTimeMinutes <= 180) return '3-hours';
    if (constrainedTimeMinutes <= 240) return '4-hours';
    if (constrainedTimeMinutes <= 360) return '6-hours';
    return 'weekend';
  };
  
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(getInitialTimeSlot());
  
  // Debug constraint information
  console.log('🎯 QuickDialogueSetup Debug:', {
    constrainedTimeMinutes,
    initialTimeSlot: getInitialTimeSlot(),
    selectedTimeSlot
  });

  // Time-based dialogue configurations with mixed breakout types
  const timeConfigurations = useMemo(() => ({
    '60-min': {
      label: '60 minutes',
      emoji: '🚨',
      status: 'suboptimal',
      warning: 'Very rushed. Consider 90+ minutes for meaningful dialogue.',
      phases: {
        connect: { duration: 15, roomType: 'dyad', subphases: 'Compressed' },
        explore: { duration: 20, roomType: 'dyad', subphases: 'Rushed' },
        discover: { duration: 20, roomType: 'dyad', subphases: 'Brief' }
      },
      tradeoffs: ['Missing proper catalyst time', 'Limited community synthesis (WE phases)', 'Participants may feel unheard']
    },
    '90-min': {
      label: '90 minutes',
      emoji: '⚡',
      status: 'minimal',
      warning: 'Tight schedule. Limited catalyst variety, brief WE phases.',
      phases: {
        connect: { duration: 25, roomType: 'dyad', subphases: 'Basic 4-subphase structure' },
        explore: { duration: 30, roomType: 'dyad', subphases: 'Streamlined' },
        discover: { duration: 30, roomType: 'triad', subphases: 'Focused' }
      },
      tradeoffs: ['Limited catalyst diversity', 'Brief WE synthesis', 'Fast-paced transitions']
    },
    '2-hours': {
      label: '2 hours',
      emoji: '⏰',
      status: 'solid',
      warning: null,
      phases: {
        connect: { duration: 35, roomType: 'dyad', subphases: 'Full structure' },
        explore: { duration: 40, roomType: 'triad', subphases: 'Meaningful sharing' },
        discover: { duration: 40, roomType: 'triad', subphases: 'Good synthesis' }
      },
      benefits: ['Full subphase structure', 'Meaningful sharing time', 'Proper catalysts and WE synthesis']
    },
    '3-hours': {
      label: '3 hours',
      emoji: '🎯',
      status: 'recommended',
      warning: null,
      phases: {
        connect: { duration: 50, roomType: 'dyad', subphases: 'Deep connection' },
        explore: { duration: 60, roomType: 'triad', subphases: 'Rich exploration' },
        discover: { duration: 65, roomType: 'quad', subphases: 'Diverse synthesis' }
      },
      benefits: ['Progressive depth', 'Diverse perspectives', 'Balanced pacing', 'Rich community synthesis']
    },
    '4-hours': {
      label: '4 hours',
      emoji: '🌟',
      status: 'rich',
      warning: null,
      phases: {
        connect: { duration: 60, roomType: 'dyad', subphases: 'Intimate bonding' },
        explore: { duration: 75, roomType: 'triad', subphases: 'Deep exploration' },
        discover: { duration: 80, roomType: 'kiva', subphases: 'Community wisdom' }
      },
      benefits: ['Deep exploration', 'Maximum diversity', 'Extended catalysts', 'Thorough WE integration']
    },
    'full-day': {
      label: 'Full day (6-8 hours)',
      emoji: '🏔️',
      status: 'transformative',
      warning: null,
      phases: {
        connect: { duration: 90, roomType: 'dyad', subphases: 'Deep trust building' },
        explore: { duration: 120, roomType: 'quad', subphases: 'Multi-perspective exploration' },
        discover: { duration: 150, roomType: 'kiva', subphases: 'Transformative synthesis' }
      },
      benefits: ['Multiple catalyst types', 'Extended reflection', 'Breaks and meals included', 'Optional additional cycles']
    },
    'weekend': {
      label: 'Weekend (Multi-day)',
      emoji: '🏕️',
      status: 'intensive',
      warning: null,
      phases: {
        connect: { duration: 120, roomType: 'dyad', subphases: 'Day 1: Connection foundation' },
        explore: { duration: 180, roomType: 'quad', subphases: 'Day 1-2: Deep exploration' },
        discover: { duration: 240, roomType: 'kiva', subphases: 'Day 2: Synthesis + Second cycle' }
      },
      benefits: ['Multiple dialogue cycles', 'Deep community building', 'Evening reflection', 'Morning check-ins', 'Harvest preparation']
    }
  }), []);

  const selectedConfig = timeConfigurations[selectedTimeSlot];

  // Calculate room counts based on participant count and room types
  const calculateRooms = useMemo(() => {
    const roomSizes = { dyad: 2, triad: 3, quad: 4, kiva: 6 };
    
    return {
      connect: Math.ceil(participantCount / roomSizes[selectedConfig.phases.connect.roomType]),
      explore: Math.ceil(participantCount / roomSizes[selectedConfig.phases.explore.roomType]),
      discover: Math.ceil(participantCount / roomSizes[selectedConfig.phases.discover.roomType])
    };
  }, [participantCount, selectedConfig]);

  const handleCreateDialogue = () => {
    const dialogueConfig = {
      title: `${selectedConfig.label} Dialogue Session`,
      participantCount,
      timeSlot: selectedTimeSlot,
      configuration: selectedConfig,
      roomCounts: calculateRooms,
      createdAt: new Date().toISOString(),
      type: 'quick-setup'
    };

    onCreateDialogue(dialogueConfig);
  };

  const getStatusColor = (status) => {
    const colors = {
      suboptimal: '#e74c3c',
      minimal: '#f39c12', 
      solid: '#27ae60',
      recommended: '#2ecc71',
      rich: '#3498db',
      transformative: '#9b59b6',
      intensive: '#8e44ad'
    };
    return colors[status] || '#95a5a6';
  };

  return (
    <div className="quick-dialogue-setup-modal" onClick={(e) => e.target.className === 'quick-dialogue-setup-modal' && onClose()}>
      <div className="quick-setup-content">
        <div className="quick-setup-header">
          <h2>🎯 Quick Dialogue Setup</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="setup-section">
          <label className="setup-label">
            👥 How many participants?
            <input 
              type="number" 
              value={participantCount} 
              onChange={(e) => setParticipantCount(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              max="1000"
              className="participant-input"
            />
            <span className="input-suffix">people</span>
          </label>
        </div>

        <div className="setup-section">
          <label className="setup-label">
            ⏰ How much time can you gather?
            {constrainedTimeMinutes && (
              <span className="time-constraint-note">
                (Time constraint: {constrainedTimeMinutes} minutes)
              </span>
            )}
          </label>
          <div className="time-options">
            {Object.entries(timeConfigurations).map(([key, config]) => {
              // Calculate if this option exceeds the time constraint
              const totalMinutes = config.phases.connect.duration + config.phases.explore.duration + config.phases.discover.duration + 5; // +5 for closing
              const exceedsConstraint = constrainedTimeMinutes && totalMinutes > constrainedTimeMinutes;
              
              return (
                <button
                  key={key}
                  className={`time-option ${selectedTimeSlot === key ? 'selected' : ''} ${config.status} ${exceedsConstraint ? 'exceeds-constraint' : ''}`}
                  onClick={() => !exceedsConstraint && setSelectedTimeSlot(key)}
                  disabled={exceedsConstraint}
                  style={{ borderColor: selectedTimeSlot === key ? getStatusColor(config.status) : undefined }}
                  title={exceedsConstraint ? `This option requires ${totalMinutes} minutes, exceeding your ${constrainedTimeMinutes} minute constraint` : undefined}
                >
                  <span className="time-emoji">{config.emoji}</span>
                  <span className="time-label">{config.label}</span>
                  {exceedsConstraint && <span className="constraint-indicator">🚫</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="recommendation-section">
          <div className="recommendation-header" style={{ color: getStatusColor(selectedConfig.status) }}>
            {selectedConfig.emoji} Recommended Configuration ({selectedConfig.label})
          </div>
          
          {selectedConfig.warning && (
            <div className="warning-message">
              ⚠️ {selectedConfig.warning}
            </div>
          )}

          <div className="phase-breakdown">
            <div className="phase-item">
              <strong>Connect:</strong> {selectedConfig.phases.connect.roomType}s ({selectedConfig.phases.connect.duration} min)
              <span className="room-count">{calculateRooms.connect} rooms</span>
            </div>
            <div className="phase-arrow">→</div>
            <div className="phase-item">
              <strong>Explore:</strong> {selectedConfig.phases.explore.roomType}s ({selectedConfig.phases.explore.duration} min)
              <span className="room-count">{calculateRooms.explore} rooms</span>
            </div>
            <div className="phase-arrow">→</div>
            <div className="phase-item">
              <strong>Discover:</strong> {selectedConfig.phases.discover.roomType}s ({selectedConfig.phases.discover.duration} min)
              <span className="room-count">{calculateRooms.discover} rooms</span>
            </div>
          </div>

          {selectedConfig.benefits && (
            <div className="benefits-list">
              <strong>✅ What you get:</strong>
              <ul>
                {selectedConfig.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
          )}

          {selectedConfig.tradeoffs && (
            <div className="tradeoffs-list">
              <strong>⚠️ Trade-offs:</strong>
              <ul>
                {selectedConfig.tradeoffs.map((tradeoff, index) => (
                  <li key={index}>{tradeoff}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="setup-actions">
          <button className="btn-secondary" onClick={onAdvancedSetup}>
            ⚙️ Advanced Setup
          </button>
          <button 
            className="btn-primary" 
            onClick={handleCreateDialogue}
            style={{ backgroundColor: getStatusColor(selectedConfig.status) }}
          >
            Create Dialogue Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickDialogueSetup;
