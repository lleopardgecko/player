'use client';

import { usePlayer } from './PlayerProvider';
import { formatDuration } from '@/lib/format';

interface Props {
  onClose: () => void;
}

export function QueueView({ onClose }: Props) {
  const {
    currentTrack,
    queue,
    removeFromQueue,
    clearQueue,
    jumpToQueueIndex,
  } = usePlayer();

  return (
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center justify-between border-b border-border px-4 pb-3 pt-3 safe-top">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-border px-4 py-1.5 text-[13px] font-medium text-accent active:bg-surface"
        >
          Done
        </button>
        <h2 className="text-[15px] font-semibold text-accent">Up Next</h2>
        <button
          type="button"
          onClick={clearQueue}
          className="rounded-full border border-border px-4 py-1.5 text-[13px] font-medium text-accent active:bg-surface disabled:opacity-30"
          disabled={queue.length === 0}
        >
          Clear
        </button>
      </header>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        {currentTrack && (
          <div className="border-b border-border bg-accent px-4 py-3 text-white">
            <div className="text-[11px] uppercase tracking-wider text-white/60">
              Now Playing
            </div>
            <div className="mt-0.5 truncate text-[14px] font-medium">
              {currentTrack.title}
            </div>
          </div>
        )}
        {queue.length === 0 ? (
          <div className="px-8 py-16 text-center text-[13px] text-muted">
            Queue is empty.
          </div>
        ) : (
          <ul>
            {queue.map((t, i) => (
              <li
                key={`${t.id}-${i}`}
                className="flex items-center gap-2 border-b border-border px-4 py-3"
              >
                <button
                  type="button"
                  onClick={() => void jumpToQueueIndex(i)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[14px] text-accent">
                    {t.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-muted">
                    {formatDuration(t.duration_seconds)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(i)}
                  className="flex h-8 w-8 items-center justify-center text-[20px] text-muted active:text-accent"
                  aria-label="Remove from queue"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
