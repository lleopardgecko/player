'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clearTracks,
  deleteTrack,
  getAllTracks,
  getStorageStats,
  updateTrackFields,
} from '@/lib/db';
import { formatBytes } from '@/lib/format';
import { probeDuration } from '@/lib/probe';
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

  const probedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    const todo = tracks.filter(
      (t) => t.duration_seconds == null && !probedRef.current.has(t.id),
    );
    if (todo.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const t of todo) {
        if (cancelled) return;
        probedRef.current.add(t.id);
        const d = await probeDuration(t.blob, t.media_type);
        if (cancelled) return;
        if (d != null) {
          await updateTrackFields(t.id, { duration_seconds: d });
          setTracks((prev) =>
            prev.map((x) =>
              x.id === t.id ? { ...x, duration_seconds: d } : x,
            ),
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tracks]);

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
    <div className="flex h-full flex-col bg-white">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-white px-4 pb-3 pt-3 safe-top">
        <div className="w-11" />
        <h1 className="text-[16px] font-bold text-accent">Library</h1>
        <ImportButton onImported={refresh} />
      </header>

      <div className="border-b border-border bg-white px-4 py-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search"
          className="w-full rounded-full border border-border bg-surface px-4 py-2.5 text-[14px] text-accent placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
        />

        <div className="mt-3 flex gap-1">
          {(['all', 'audio', 'video'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-full px-4 py-1.5 text-[13px] font-medium capitalize transition ${
                filter === f
                  ? 'bg-accent text-white'
                  : 'text-muted active:bg-surface'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          tracks.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="px-8 py-16 text-center text-[13px] text-muted">
              No tracks match.
            </div>
          )
        ) : (
          <ul>
            {filtered.map((t, i) => (
              <li key={t.id}>
                <TrackRow
                  track={t}
                  index={i}
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
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[12px] text-muted">
            <span>
              {stats.count} tracks · {formatBytes(stats.totalBytes)}
            </span>
            <button
              type="button"
              onClick={onClear}
              className="text-[#c0392b]"
            >
              Clear library
            </button>
          </div>
        )}
        <div className="h-20" />
      </div>
    </div>
  );
}
