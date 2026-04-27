'use client';

import { usePlayer } from './PlayerProvider';

interface Props {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: Props) {
  const { currentTrack, isPlaying, toggle } = usePlayer();
  if (!currentTrack) return null;

  return (
    <button
      type="button"
      onClick={onExpand}
      className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-border bg-surface px-4 py-3 text-left safe-bottom"
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-surface2 text-lg text-muted">
        {currentTrack.media_type === 'video' ? '▷' : '♪'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-accent">
          {currentTrack.title}
        </div>
        <div className="truncate text-xs text-muted">
          {currentTrack.media_type === 'video' ? 'Video' : 'Audio'}
        </div>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-base text-bg"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
    </button>
  );
}
