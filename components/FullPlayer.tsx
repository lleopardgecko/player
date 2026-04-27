'use client';

import { useState } from 'react';
import { usePlayer } from './PlayerProvider';
import { ProgressBar } from './ProgressBar';
import { SpeedControl } from './SpeedControl';
import { VideoPortal } from './VideoPortal';
import { QueueView } from './QueueView';

interface Props {
  open: boolean;
  onCollapse: () => void;
}

export function FullPlayer({ open, onCollapse }: Props) {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    toggle,
    seekTo,
    skipBack,
    skipForward,
    playNext,
    playPrevious,
  } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);

  const isVideo = currentTrack?.media_type === 'video';

  return (
    <div
      className="fixed inset-0 z-40 bg-bg transition-transform duration-300"
      style={{
        transform: open ? 'translateY(0)' : 'translateY(100%)',
      }}
      aria-hidden={!open}
    >
      {showQueue ? (
        <QueueView onClose={() => setShowQueue(false)} />
      ) : (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between px-4 pt-4 pb-2 safe-top">
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-9 w-9 items-center justify-center text-2xl text-muted"
              aria-label="Collapse"
            >
              ⌄
            </button>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">
              {isVideo ? 'Video' : 'Audio'}
            </div>
            <div className="w-9" />
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-6">
            {isVideo && (
              <VideoPortal className="aspect-video w-full overflow-hidden rounded-2xl bg-black" />
            )}
          </div>

          <div className="px-6">
            <div className="mb-1 truncate text-center text-xl font-semibold text-accent">
              {currentTrack?.title || 'Nothing playing'}
            </div>
            <div className="mb-4 truncate text-center text-xs text-muted">
              {currentTrack
                ? `${currentTrack.file_ext.toUpperCase()} · ${currentTrack.filename}`
                : ''}
            </div>

            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={seekTo}
            />

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => skipBack(15)}
                className="flex h-12 w-12 items-center justify-center text-xs font-medium text-accent"
                aria-label="Skip back 15 seconds"
              >
                −15
              </button>
              <button
                type="button"
                onClick={() => void playPrevious()}
                className="flex h-12 w-12 items-center justify-center text-2xl text-accent"
                aria-label="Previous"
              >
                ⏮
              </button>
              <button
                type="button"
                onClick={toggle}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-2xl text-bg active:scale-95"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                onClick={() => void playNext()}
                className="flex h-12 w-12 items-center justify-center text-2xl text-accent"
                aria-label="Next"
              >
                ⏭
              </button>
              <button
                type="button"
                onClick={() => skipForward(30)}
                className="flex h-12 w-12 items-center justify-center text-xs font-medium text-accent"
                aria-label="Skip forward 30 seconds"
              >
                +30
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between pb-8 safe-bottom">
              <SpeedControl />
              <button
                type="button"
                onClick={() => setShowQueue(true)}
                className="rounded-full bg-surface2 px-3 py-1.5 text-xs font-medium text-accent"
              >
                Queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
