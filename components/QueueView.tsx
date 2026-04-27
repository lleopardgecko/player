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
    <div className="flex h-full flex-col bg-pinstripe">
      <header className="flex items-center justify-between bg-metal etched border-b border-border px-3 pt-3 pb-2 safe-top">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-metal border border-border px-2 py-0.5 text-[11px] font-semibold text-accent aqua-glow"
        >
          Done
        </button>
        <h2 className="text-[13px] font-bold text-accent">Up Next</h2>
        <button
          type="button"
          onClick={clearQueue}
          className="rounded-full bg-metal border border-border px-2 py-0.5 text-[11px] font-semibold text-accent aqua-glow disabled:opacity-30"
          disabled={queue.length === 0}
        >
          Clear
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {currentTrack && (
          <div className="bg-selection border-b border-border px-3 py-2 text-white">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-white/80">
              Now Playing
            </div>
            <div className="mt-0.5 truncate text-[12px] font-semibold">
              {currentTrack.title}
            </div>
          </div>
        )}
        {queue.length === 0 ? (
          <div className="px-8 py-16 text-center text-[12px] text-muted">
            Queue is empty.
          </div>
        ) : (
          <ul>
            {queue.map((t, i) => (
              <li
                key={`${t.id}-${i}`}
                className={`flex items-center gap-2 border-b border-[#c8c8c8] px-3 py-1.5 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-[#edf3fe]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => void jumpToQueueIndex(i)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[12px] text-accent">
                    {t.title}
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted">
                    {formatDuration(t.duration_seconds)}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => removeFromQueue(i)}
                  className="px-2 text-[16px] text-muted"
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
