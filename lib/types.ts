export type MediaType = 'audio' | 'video';

export interface Track {
  id: number;
  filename: string;
  title: string;
  media_type: MediaType;
  file_ext: string;
  file_size_bytes: number;
  blob: Blob;
  thumb_blob: Blob | null;
  duration_seconds: number | null;
  added_at: number;
  last_played_at: number | null;
  last_position_seconds: number;
}

export type NewTrack = Omit<Track, 'id'>;

export type AppStateKey = 'queue' | 'current_track_id' | 'playback_rate';

export interface AppStateMap {
  queue: number[];
  current_track_id: number | null;
  playback_rate: number;
}
