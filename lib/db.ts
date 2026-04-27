import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { AppStateMap, NewTrack, Track } from './types';

interface PlayerDB extends DBSchema {
  tracks: {
    key: number;
    value: Track;
    indexes: { by_filename: string };
  };
  app_state: {
    key: string;
    value: unknown;
  };
}

const DB_NAME = 'yt-player';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PlayerDB>> | null = null;

function getDB() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available'));
  }
  if (!dbPromise) {
    dbPromise = openDB<PlayerDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tracks')) {
          const store = db.createObjectStore('tracks', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by_filename', 'filename', { unique: false });
        }
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state');
        }
      },
    });
  }
  return dbPromise;
}

export async function addTrack(track: NewTrack): Promise<number> {
  const db = await getDB();
  const id = await db.add('tracks', track as Track);
  return id as number;
}

export async function getAllTracks(): Promise<Track[]> {
  const db = await getDB();
  const tracks = await db.getAll('tracks');
  return tracks.sort((a, b) => b.added_at - a.added_at);
}

export async function getTrack(id: number): Promise<Track | undefined> {
  const db = await getDB();
  return db.get('tracks', id);
}

export async function deleteTrack(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('tracks', id);
}

export async function clearTracks(): Promise<void> {
  const db = await getDB();
  await db.clear('tracks');
}

export async function updateTrackFields(
  id: number,
  fields: Partial<Track>,
): Promise<void> {
  const db = await getDB();
  const existing = await db.get('tracks', id);
  if (!existing) return;
  await db.put('tracks', { ...existing, ...fields, id });
}

export async function findDuplicate(
  filename: string,
  fileSize: number,
): Promise<Track | undefined> {
  const db = await getDB();
  const matches = await db.getAllFromIndex('tracks', 'by_filename', filename);
  return matches.find((t) => t.file_size_bytes === fileSize);
}

export async function getAppState<K extends keyof AppStateMap>(
  key: K,
): Promise<AppStateMap[K] | undefined> {
  const db = await getDB();
  return (await db.get('app_state', key)) as AppStateMap[K] | undefined;
}

export async function setAppState<K extends keyof AppStateMap>(
  key: K,
  value: AppStateMap[K],
): Promise<void> {
  const db = await getDB();
  await db.put('app_state', value, key);
}

export async function getStorageStats(): Promise<{
  count: number;
  totalBytes: number;
}> {
  const db = await getDB();
  const tracks = await db.getAll('tracks');
  return {
    count: tracks.length,
    totalBytes: tracks.reduce((sum, t) => sum + t.file_size_bytes, 0),
  };
}
