'use client';

import { useRef, useState } from 'react';
import { formatBytes, formatDuration } from '@/lib/format';
import { useBlobUrl } from '@/lib/useBlobUrl';
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
  isCurrent,
  onPlay,
  onDelete,
  onAddToQueue,
}: Props) {
  const thumbUrl = useBlobUrl(track.thumb_blob);
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
          className="h-full w-20 border-l border-border bg-surface text-[13px] font-medium text-accent"
        >
          Queue
        </button>
        <button
          type="button"
          onClick={() => {
            onDelete();
            setOffset(0);
          }}
          className="h-full w-20 bg-[#c0392b] text-[13px] font-medium text-white"
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
        className={`relative flex w-full items-center gap-3 px-4 py-3.5 text-left transition-transform ${
          isCurrent ? 'bg-accent text-white' : 'bg-white text-accent'
        }`}
        style={{ transform: `translateX(${offset}px)` }}
      >
        <span className={`w-3 shrink-0 text-[12px] ${isCurrent ? 'text-white' : 'text-transparent'}`}>
          ▶
        </span>
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded object-cover"
          />
        ) : (
          <div className="h-11 w-11 shrink-0 rounded bg-surface" />
        )}
        <div className="min-w-0 flex-1">
          <div className={`truncate text-[15px] font-medium ${isCurrent ? 'text-white' : 'text-accent'}`}>
            {track.title || track.filename}
          </div>
          <div className={`mt-0.5 truncate text-[12px] ${isCurrent ? 'text-white/70' : 'text-muted'}`}>
            {track.media_type === 'video' ? 'Video' : 'Audio'} · {formatBytes(track.file_size_bytes)}
          </div>
        </div>
        <div className={`tabular-nums text-[13px] ${isCurrent ? 'text-white/70' : 'text-muted'}`}>
          {formatDuration(track.duration_seconds)}
        </div>
      </button>
    </div>
  );
}
