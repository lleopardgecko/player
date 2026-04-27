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
    <div className="flex h-full flex-col bg-bg">
      <header className="flex items-center justify-between px-4 pt-4 pb-3 safe-top">
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-muted"
        >
          Done
        </button>
        <h2 className="text-base font-semibold text-accent">Up Next</h2>
        <button
          type="button"
          onClick={clearQueue}
          className="text-sm text-muted disabled:opacity-30"
          disabled={queue.length === 0}
        >
          Clear
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {currentTrack && (
          <div className="border-b border-border px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Now Playing
            </div>
            <div className="mt-1 truncate text-[15px] text-accent2">
              {currentTrack.title}
            </div>
          </div>
        )}
        {queue.length === 0 ? (
          <div className="px-8 py-16 text-center text-sm text-muted">
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
                  <div className="truncate text-[15px] text-accent">
                    {t.title}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {formatDuration(t.duration_seconds)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(i)}
                  className="px-2 text-xl text-muted"
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
