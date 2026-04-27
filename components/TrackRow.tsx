'use client';

import { useRef, useState } from 'react';
import { formatBytes, formatDuration } from '@/lib/format';
import type { Track } from '@/lib/types';

interface Props {
  track: Track;
  isCurrent: boolean;
  onPlay: () => void;
  onDelete: () => void;
  onAddToQueue: () => void;
}

const SWIPE_THRESHOLD = 80;
const MAX_REVEAL = 160;

export function TrackRow({
  track,
  isCurrent,
  onPlay,
  onDelete,
  onAddToQueue,
}: Props) {
  const [offset, setOffset] = useState(0);
  const startXRef = useRef<number | null>(null);
  const startOffsetRef = useRef(0);
  const movedRef = useRef(false);

  const onTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startOffsetRef.current = offset;
    movedRef.current = false;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startXRef.current == null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const next = Math.max(
      -MAX_REVEAL,
      Math.min(0, startOffsetRef.current + dx),
    );
    if (Math.abs(dx) > 4) movedRef.current = true;
    setOffset(next);
  };
  const onTouchEnd = () => {
    if (offset < -SWIPE_THRESHOLD) setOffset(-MAX_REVEAL);
    else setOffset(0);
    startXRef.current = null;
  };

  const onTap = () => {
    if (movedRef.current) return;
    if (offset !== 0) {
      setOffset(0);
      return;
    }
    onPlay();
  };

  return (
    <div className="relative overflow-hidden border-b border-border">
      {/* Action layer */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={() => {
            onAddToQueue();
            setOffset(0);
          }}
          className="h-full w-20 bg-surface2 text-xs font-medium text-accent"
        >
          Queue
        </button>
        <button
          type="button"
          onClick={() => {
            onDelete();
            setOffset(0);
          }}
          className="h-full w-20 bg-red-600 text-xs font-medium text-white"
        >
          Delete
        </button>
      </div>
      {/* Row */}
      <button
        type="button"
        onClick={onTap}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="relative flex w-full items-center bg-bg px-4 py-3 text-left transition-transform"
        style={{ transform: `translateX(${offset}px)` }}
      >
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-[15px] ${
              isCurrent ? 'text-accent2' : 'text-accent'
            }`}
          >
            {track.title || track.filename}
          </div>
          <div className="mt-0.5 flex gap-2 text-xs text-muted">
            <span>{formatDuration(track.duration_seconds)}</span>
            <span>·</span>
            <span>{formatBytes(track.file_size_bytes)}</span>
          </div>
        </div>
      </button>
    </div>
  );
}
