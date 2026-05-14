'use client';

import { useRef } from 'react';
import { usePlayer } from './PlayerProvider';

interface Props {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: Props) {
  const { currentTrack, isPlaying, toggle } = usePlayer();
  const touchStartRef = useRef<{ x: number; y: number; t: number } | null>(
    null,
  );
  if (!currentTrack) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now() };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dy = start.y - t.clientY;
    const dx = Math.abs(t.clientX - start.x);
    const dt = Date.now() - start.t;
    if (dy > 30 && dy > dx && dt < 600) {
      e.preventDefault();
      onExpand();
    }
  };

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
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="fixed inset-x-0 bottom-0 z-30 flex cursor-pointer touch-pan-x items-center gap-3 border-t border-border bg-white px-4 py-3 text-left safe-bottom"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] text-white active:opacity-75"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? '❚❚' : '▶'}
      </button>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-medium text-accent">
          {currentTrack.title}
        </div>
        <div className="truncate text-[11px] text-muted">
          {currentTrack.media_type === 'video' ? 'Video' : 'Audio'}
        </div>
      </div>
      <span className="text-[16px] text-muted">⌃</span>
    </div>
  );
}
