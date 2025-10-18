import React, { useEffect, useRef } from 'react';

const VideoTileWithFit = ({ participant, getObjectFit, isMock }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const handleResize = () => {}; // No-op, object-fit handled by CSS
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMock && ref.current) {
      const track = participant.tracks?.video?.persistentTrack || participant.tracks?.video?.track;
      if (track) {
        ref.current.srcObject = new MediaStream([track]);
      }
    }
  }, [participant, isMock]);

  if (isMock) {
    return (
      <img
        ref={ref}
        src={participant.mockImage}
        alt={participant.user_name}
        style={{ width: '100%', height: '100%', objectFit: 'cover', background: '#222', display: 'block' }}
      />
    );
  }

  return (
    <video
      autoPlay
      playsInline
      muted={participant.local}
      ref={ref}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: 'center',
        background: '#000',
        display: 'block',
      }}
    />
  );
};

export default React.memo(VideoTileWithFit);
