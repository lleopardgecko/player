'use client';

import { usePlayer } from './PlayerProvider';

interface Props {
  className?: string;
}

export function Visualizer({ className }: Props) {
  const { currentTrack } = usePlayer();

  const title = currentTrack?.title ?? '';
  const initial = title.trim().charAt(0).toUpperCase() || '♪';

  return (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-lg bg-accent ${className ?? ''}`}
    >
      <span
        className="text-[80px] font-bold text-white"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {initial}
      </span>
    </div>
  );
}
