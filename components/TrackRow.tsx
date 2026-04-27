'use client';

import { useRef, useState } from 'react';
import { formatBytes, formatDuration } from '@/lib/format';
import type { Track } from '@/lib/types';

interface Props {
  track: Track;
  index: number;
  isCurrent: boolean;
  onPlay: () => void;
  onDelete: () => void;
  onAddToQueue: () => void;
}

const SWIPE_THRESHOLD = 80;
const MAX_REVEAL = 160;

export function TrackRow({
  track,
  index,
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

  const rowBg = isCurrent
    ? 'bg-selection text-white'
    : index % 2 === 0
      ? 'bg-white text-accent'
      : 'bg-[#edf3fe] text-accent';

  const titleClass = isCurrent
    ? 'text-white font-semibold'
    : 'text-accent';
  const metaClass = isCurrent ? 'text-white/85' : 'text-muted';

  return (
    <div className="relative overflow-hidden border-b border-[#c8c8c8]">
      {/* Action layer */}
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={() => {
            onAddToQueue();
            setOffset(0);
          }}
          className="h-full w-20 bg-metal border-l border-border text-[11px] font-semibold text-accent"
        >
          Queue
        </button>
        <button
          type="button"
          onClick={() => {
            onDelete();
            setOffset(0);
          }}
          className="h-full w-20 bg-[linear-gradient(to_bottom,#ff7a7a,#c42020)] text-[11px] font-semibold text-white"
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
        className={`relative flex w-full items-center gap-3 px-3 py-2.5 text-left transition-transform ${rowBg}`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <span className={`w-3 text-[11px] ${isCurrent ? 'text-white' : 'text-transparent'}`}>
          ▶
        </span>
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[14px] ${titleClass}`}>
            {track.title || track.filename}
          </div>
          <div className={`mt-0.5 truncate text-[11px] ${metaClass}`}>
            {track.media_type === 'video' ? 'Video' : 'Audio'} · {formatBytes(track.file_size_bytes)}
          </div>
        </div>
        <div className={`tabular-nums text-[12px] ${metaClass}`}>
          {formatDuration(track.duration_seconds)}
        </div>
      </button>
    </div>
  );
}
