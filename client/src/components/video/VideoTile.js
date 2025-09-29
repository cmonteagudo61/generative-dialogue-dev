import React, { useEffect, useRef } from 'react';

const VideoTileWithFit = ({ participant, getObjectFit, isMock }) => {
  const ref = useRef(null);
  const streamCache = useRef(new Map());

  useEffect(() => {
    if (!ref.current) return;
    const handleResize = () => {}; // No-op, object-fit handled by CSS
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMock && ref.current && participant.tracks?.video?.persistentTrack) {
      const t = participant.tracks.video.persistentTrack;
      let ms = streamCache.current.get(t.id);
      if (!ms) { ms = new MediaStream([t]); streamCache.current.set(t.id, ms); }
      if (ref.current.srcObject !== ms) ref.current.srcObject = ms;
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
        animation: 'none',
        transition: 'none',
        backfaceVisibility: 'hidden',
        willChange: 'auto',
      }}
    />
  );
};

export default React.memo(VideoTileWithFit);
