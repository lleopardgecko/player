'use client';

import { useState } from 'react';
import { usePlayer } from './PlayerProvider';
import { ProgressBar } from './ProgressBar';
import { SpeedControl } from './SpeedControl';
import { VideoPortal } from './VideoPortal';
import { QueueView } from './QueueView';
import { Visualizer } from './Visualizer';
import { useBlobUrl } from '@/lib/useBlobUrl';

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
  const thumbUrl = useBlobUrl(currentTrack?.thumb_blob ?? null);

  return (
    <div
      className="fixed inset-0 z-40 bg-white transition-transform duration-300"
      style={{
        transform: open ? 'translateY(0)' : 'translateY(100%)',
      }}
      aria-hidden={!open}
    >
      {showQueue ? (
        <QueueView onClose={() => setShowQueue(false)} />
      ) : (
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 pb-2 pt-3 safe-top">
            <button
              type="button"
              onClick={onCollapse}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-[20px] text-accent active:bg-border"
              aria-label="Collapse"
            >
              ⌄
            </button>
            <span className="text-[11px] uppercase tracking-widest text-muted">
              {isVideo ? 'Video' : 'Audio'}
            </span>
            <div className="w-10" />
          </header>

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-4">
            {isVideo ? (
              <VideoPortal className="aspect-video w-full overflow-hidden rounded-lg bg-black" />
            ) : thumbUrl ? (
              <img
                src={thumbUrl}
                alt=""
                className="min-h-0 w-full flex-1 rounded-xl object-contain"
              />
            ) : (
              <Visualizer className="min-h-0 w-full flex-1" />
            )}
          </div>

          <div className="px-5 pb-4">
            <div className="mb-4">
              <div className="truncate text-[18px] font-semibold text-accent">
                {currentTrack?.title || 'Nothing playing'}
              </div>
              <div className="mt-1 truncate text-[13px] text-muted">
                {currentTrack
                  ? `${currentTrack.file_ext.toUpperCase()} · ${currentTrack.filename}`
                  : ''}
              </div>
            </div>

            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={seekTo}
            />

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={() => skipBack(15)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-[12px] font-semibold text-accent active:bg-border"
                aria-label="Skip back 15 seconds"
              >
                −15
              </button>
              <button
                type="button"
                onClick={() => void playPrevious()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-[22px] text-accent active:bg-border"
                aria-label="Previous"
              >
                ⏮
              </button>
              <button
                type="button"
                onClick={toggle}
                className="flex h-20 w-20 items-center justify-center rounded-full bg-accent text-[22px] text-white active:opacity-75"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? '❚❚' : '▶'}
              </button>
              <button
                type="button"
                onClick={() => void playNext()}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-[22px] text-accent active:bg-border"
                aria-label="Next"
              >
                ⏭
              </button>
              <button
                type="button"
                onClick={() => skipForward(30)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-[12px] font-semibold text-accent active:bg-border"
                aria-label="Skip forward 30 seconds"
              >
                +30
              </button>
            </div>

            <div className="mt-6 flex items-center justify-between pb-6 safe-bottom">
              <SpeedControl />
              <button
                type="button"
                onClick={() => setShowQueue(true)}
                className="rounded-full border border-border px-4 py-2 text-[13px] font-medium text-accent active:bg-surface"
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
