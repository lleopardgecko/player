'use client';

import { useState } from 'react';
import { usePlayer } from './PlayerProvider';
import { ProgressBar } from './ProgressBar';
import { SpeedControl } from './SpeedControl';
import { VideoPortal } from './VideoPortal';
import { QueueView } from './QueueView';
import { Visualizer } from './Visualizer';

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
      className="fixed inset-0 z-40 bg-metal transition-transform duration-300"
      style={{
        transform: open ? 'translateY(0)' : 'translateY(100%)',
      }}
      aria-hidden={!open}
    >
      {showQueue ? (
        <QueueView onClose={() => setShowQueue(false)} />
      ) : (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between bg-metal-dark etched border-b border-border px-3 pt-3 pb-2 safe-top">
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-7 w-9 items-center justify-center rounded-full bg-metal border border-border text-[14px] text-accent aqua-glow"
              aria-label="Collapse"
            >
              ⌄
            </button>
            <div className="rounded-full border border-border bg-white/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">
              {isVideo ? 'Video' : 'Audio'}
            </div>
            <div className="w-9" />
          </header>

          <div className="flex flex-1 flex-col items-center justify-center px-4 py-3">
            {isVideo ? (
              <VideoPortal className="aspect-video w-full overflow-hidden rounded-md border border-border bg-black shadow-inner" />
            ) : (
              <Visualizer className="h-full w-full" />
            )}
          </div>

          <div className="px-4 pb-2">
            <div className="lcd-inset rounded-md bg-lcd px-3 py-2">
              <div className="mb-0.5 truncate text-center text-[13px] font-semibold text-accent">
                {currentTrack?.title || 'Nothing playing'}
              </div>
              <div className="mb-2 truncate text-center text-[10px] text-muted">
                {currentTrack
                  ? `${currentTrack.file_ext.toUpperCase()} · ${currentTrack.filename}`
                  : ''}
              </div>

              <ProgressBar
                currentTime={currentTime}
                duration={duration}
                onSeek={seekTo}
              />
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => skipBack(15)}
                className="flex h-10 w-12 items-center justify-center rounded-full bg-metal border border-border text-[10px] font-semibold text-accent aqua-glow"
                aria-label="Skip back 15 seconds"
              >
                −15
              </button>
              <button
                type="button"
                onClick={() => void playPrevious()}
                className="flex h-10 w-12 items-center justify-center rounded-full bg-metal border border-border text-[16px] text-accent aqua-glow"
                aria-label="Previous"
              >
                ⏮
              </button>
              <button
                type="button"
                onClick={toggle}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-aqua-button border border-aqua-dark text-[18px] text-white aqua-glow active:scale-95"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                onClick={() => void playNext()}
                className="flex h-10 w-12 items-center justify-center rounded-full bg-metal border border-border text-[16px] text-accent aqua-glow"
                aria-label="Next"
              >
                ⏭
              </button>
              <button
                type="button"
                onClick={() => skipForward(30)}
                className="flex h-10 w-12 items-center justify-center rounded-full bg-metal border border-border text-[10px] font-semibold text-accent aqua-glow"
                aria-label="Skip forward 30 seconds"
              >
                +30
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between pb-6 safe-bottom">
              <SpeedControl />
              <button
                type="button"
                onClick={() => setShowQueue(true)}
                className="rounded-full bg-metal border border-border px-3 py-1 text-[11px] font-semibold text-accent aqua-glow"
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
