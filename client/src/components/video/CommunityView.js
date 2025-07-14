import React from 'react';

const CommunityView = ({ participants = [], viewMode = 'community' }) => {
  return (
    <div style={{ padding: '20px', color: 'white' }}>
      <h3>Community View</h3>
      <p>Participants: {participants.length}</p>
      <p>View Mode: {viewMode}</p>
    </div>
  );
};

export default CommunityView; 