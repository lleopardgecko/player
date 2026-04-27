'use client';

import { useEffect, useRef } from 'react';
import { usePlayer } from './PlayerProvider';

export function VideoPortal({ className }: { className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const { setVideoHost } = usePlayer();

  useEffect(() => {
    setVideoHost(hostRef.current);
    return () => setVideoHost(null);
  }, [setVideoHost]);

  return <div ref={hostRef} className={className} />;
}
