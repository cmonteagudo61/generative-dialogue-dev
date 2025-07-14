import React from 'react';
import CommunityViewExperimental from './CommunityViewExperimental';

const FishbowlView = ({ 
  participants = [], 
  selectedParticipants = [], 
  onParticipantSelect = () => {} 
}) => {
  // Get the first 6 selected participants for the fishbowl overlay
  const fishbowlParticipants = participants
    .filter(p => selectedParticipants.includes(p.session_id))
    .slice(0, 6);

  // Fill with mock participants if we don't have 6 selected
  const mockParticipants = [];
  for (let i = fishbowlParticipants.length; i < 6; i++) {
    mockParticipants.push({
      session_id: `fishbowl-mock-${i}`,
      user_name: `Speaker ${i + 1}`,
      tracks: { video: { state: 'unavailable' } },
      local: false,
      mockImage: `https://placehold.co/200x150/808080/FFFFFF?text=Speaker+${i + 1}`,
    });
  }

  const displayParticipants = [...fishbowlParticipants, ...mockParticipants];

  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Background: Community View */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity: 0.3,
        zIndex: 1
      }}>
        <CommunityViewExperimental 
          participants={participants}
          onParticipantSelect={onParticipantSelect}
        />
      </div>

      {/* Foreground: 2x3 Fishbowl Grid Overlay */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '400px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        gap: '10px',
        padding: '20px',
        backgroundColor: 'rgba(62, 76, 113, 0.9)',
        border: '3px solid #3E4C71',
        zIndex: 10
      }}>
        {displayParticipants.map((participant, index) => (
          <div
            key={participant.session_id}
            style={{
              position: 'relative',
              backgroundColor: '#3E4C71',
              overflow: 'hidden',
              border: '2px solid #3E4C71',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={() => onParticipantSelect(participant)}
          >
            {/* Video/Mock Image */}
            {participant.mockImage ? (
              <img 
                src={participant.mockImage}
                alt={participant.user_name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                backgroundColor: '#3E4C71',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px'
              }}>
                {participant.user_name || 'Participant'}
              </div>
            )}

            {/* Name Label */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              padding: '4px 8px',
              fontSize: '12px',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              {participant.user_name || `Speaker ${index + 1}`}
            </div>

            {/* Selection Indicator */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              backgroundColor: '#2A3A5C',
              border: '2px solid white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 'bold',
              color: 'white'
            }}>
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FishbowlView; 