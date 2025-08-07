import React from 'react';

const MockTileBackground = ({ image, userName }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100%',
      height: '100%',
      background: image ? `url(${image}) center center / cover no-repeat, #222` : '#222',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      boxSizing: 'border-box',
      zIndex: 1,
      backgroundSize: 'cover',
    }}
    aria-label={userName}
  />
);

export default React.memo(MockTileBackground);
