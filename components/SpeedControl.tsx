'use client';

import { usePlayer } from './PlayerProvider';

const RATES = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function SpeedControl() {
  const { playbackRate, setPlaybackRate } = usePlayer();
  const onClick = () => {
    const idx = RATES.findIndex((r) => Math.abs(r - playbackRate) < 0.01);
    const next = RATES[(idx + 1) % RATES.length];
    setPlaybackRate(next);
  };
  const label = `${playbackRate}x`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium text-accent"
    >
      {label}
    </button>
  );
}
