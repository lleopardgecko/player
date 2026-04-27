'use client';

import { useRef, useState } from 'react';
import { formatDuration } from '@/lib/format';

interface Props {
  currentTime: number;
  duration: number;
  onSeek: (seconds: number) => void;
}

export function ProgressBar({ currentTime, duration, onSeek }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [draggingValue, setDraggingValue] = useState<number | null>(null);

  const valueAt = (clientX: number) => {
    const el = trackRef.current;
    if (!el || duration <= 0) return 0;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingValue(valueAt(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (draggingValue == null) return;
    setDraggingValue(valueAt(e.clientX));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (draggingValue != null) {
      onSeek(draggingValue);
      setDraggingValue(null);
    }
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const display = draggingValue ?? currentTime;
  const ratio = duration > 0 ? Math.max(0, Math.min(1, display / duration)) : 0;

  return (
    <div className="w-full select-none">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative h-6 cursor-pointer touch-none"
      >
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full border border-border bg-white shadow-inner" />
        <div
          className="absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-selection"
          style={{ width: `${ratio * 100}%` }}
        />
        <div
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-aqua-button border border-aqua-dark aqua-glow"
          style={{ left: `${ratio * 100}%` }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-accent">
        <span>{formatDuration(display)}</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}
