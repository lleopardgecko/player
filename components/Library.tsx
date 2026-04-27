'use client';

import { useEffect, useMemo, useState } from 'react';
import { clearTracks, deleteTrack, getAllTracks, getStorageStats } from '@/lib/db';
import { formatBytes } from '@/lib/format';
import type { MediaType, Track } from '@/lib/types';
import { usePlayer } from './PlayerProvider';
import { ImportButton } from './ImportButton';
import { TrackRow } from './TrackRow';
import { EmptyState } from './EmptyState';

type Filter = 'all' | MediaType;

interface Props {
  onOpenFullPlayer: () => void;
}

export function Library({ onOpenFullPlayer }: Props) {
  const { play, addToQueue, currentTrack } = usePlayer();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [stats, setStats] = useState<{ count: number; totalBytes: number }>({
    count: 0,
    totalBytes: 0,
  });

  const refresh = async () => {
    const [t, s] = await Promise.all([getAllTracks(), getStorageStats()]);
    setTracks(t);
    setStats(s);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim().toLowerCase()), 150);
    return () => clearTimeout(id);
  }, [search]);

  const filtered = useMemo(() => {
    return tracks.filter((t) => {
      if (filter !== 'all' && t.media_type !== filter) return false;
      if (debounced) {
        const hay = (t.title + ' ' + t.filename).toLowerCase();
        if (!hay.includes(debounced)) return false;
      }
      return true;
    });
  }, [tracks, filter, debounced]);

  const onPlay = (track: Track) => {
    void play(track);
    onOpenFullPlayer();
  };
  const onDelete = async (id: number) => {
    await deleteTrack(id);
    await refresh();
  };
  const onClear = async () => {
    if (!confirm('Clear entire library? This deletes all imported files.')) return;
    await clearTracks();
    await refresh();
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-4 safe-top">
        <h1 className="text-xl font-semibold tracking-tight text-accent">Library</h1>
        <ImportButton onImported={refresh} />
      </header>

      <div className="px-4 pb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full rounded-lg bg-surface px-3 py-2 text-sm text-accent placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-border"
        />
      </div>

      <div className="flex gap-1 px-4 pb-2">
        {(['all', 'audio', 'video'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-wider transition ${
              filter === f
                ? 'bg-accent text-bg'
                : 'bg-surface2 text-muted'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {filtered.length === 0 ? (
          tracks.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="px-8 py-16 text-center text-sm text-muted">
              No tracks match.
            </div>
          )
        ) : (
          <ul>
            {filtered.map((t) => (
              <li key={t.id}>
                <TrackRow
                  track={t}
                  isCurrent={currentTrack?.id === t.id}
                  onPlay={() => onPlay(t)}
                  onDelete={() => void onDelete(t.id)}
                  onAddToQueue={() => addToQueue(t)}
                />
              </li>
            ))}
          </ul>
        )}
        {tracks.length > 0 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-4 text-xs text-muted">
            <span>
              {stats.count} tracks · {formatBytes(stats.totalBytes)}
            </span>
            <button
              type="button"
              onClick={onClear}
              className="text-red-400"
            >
              Clear library
            </button>
          </div>
        )}
        {/* spacer for mini-player */}
        <div className="h-20" />
      </div>
    </div>
  );
}
