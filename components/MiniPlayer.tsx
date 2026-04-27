'use client';

import { usePlayer } from './PlayerProvider';

interface Props {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: Props) {
  const { currentTrack, isPlaying, toggle } = usePlayer();
  if (!currentTrack) return null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExpand}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onExpand();
        }
      }}
      className="fixed inset-x-0 bottom-0 z-30 flex cursor-pointer items-center gap-3 bg-metal etched border-t border-border px-3 py-2 text-left safe-bottom"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-aqua-button border border-aqua-dark text-white text-[13px] aqua-glow active:scale-95"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <div className="lcd-inset min-w-0 flex-1 rounded-md bg-lcd px-3 py-1 text-center">
        <div className="truncate text-[11px] font-semibold text-accent">
          {currentTrack.title}
        </div>
        <div className="truncate text-[9px] uppercase tracking-wider text-muted">
          {currentTrack.media_type === 'video' ? 'Video' : 'Audio'}
        </div>
      </div>
      <span className="w-8 text-center text-[14px] text-muted">⌃</span>
    </div>
  );
}
