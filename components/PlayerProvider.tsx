'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  getAppState,
  getTrack,
  setAppState,
  updateTrackFields,
} from '@/lib/db';
import type { Track } from '@/lib/types';

interface PlayerContextValue {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  queue: Track[];
  videoHostRef: React.MutableRefObject<HTMLDivElement | null>;
  setVideoHost: (el: HTMLDivElement | null) => void;
  play: (track: Track, queueRest?: Track[]) => Promise<void>;
  pause: () => void;
  resume: () => Promise<void>;
  toggle: () => void;
  seekTo: (seconds: number) => void;
  skipForward: (seconds?: number) => void;
  skipBack: (seconds?: number) => void;
  setPlaybackRate: (rate: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (from: number, to: number) => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  clearQueue: () => void;
  jumpToQueueIndex: (index: number) => Promise<void>;
  getAudioAnalyser: () => AnalyserNode | null;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}

const SAVE_INTERVAL_MS = 5000;
const VIDEO_HIDDEN_STYLE: React.CSSProperties = {
  position: 'fixed',
  width: 1,
  height: 1,
  opacity: 0,
  pointerEvents: 'none',
  left: -9999,
  top: -9999,
};

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoHomeRef = useRef<HTMLDivElement>(null);
  const videoHostRef = useRef<HTMLDivElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastSaveRef = useRef<number>(0);
  const playedHistoryRef = useRef<number[]>([]);
  const pendingLoadedMetaRef = useRef<{
    el: HTMLMediaElement;
    handler: () => void;
  } | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  const getAudioAnalyser = useCallback((): AnalyserNode | null => {
    if (typeof window === 'undefined') return null;
    if (audioAnalyserRef.current) return audioAnalyserRef.current;
    const audio = audioRef.current;
    if (!audio) return null;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctx) return null;
      const ctx = new Ctx();
      const source = ctx.createMediaElementSource(audio);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      audioSourceRef.current = source;
      audioAnalyserRef.current = analyser;
      return analyser;
    } catch {
      return null;
    }
  }, []);

  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [queue, setQueue] = useState<Track[]>([]);

  const activeMediaEl = useCallback(
    (track: Track | null): HTMLMediaElement | null => {
      if (!track) return null;
      return track.media_type === 'video' ? videoRef.current : audioRef.current;
    },
    [],
  );

  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  const setMediaSession = useCallback(
    (track: Track) => {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator))
        return;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: 'YT Player',
        album: '',
        artwork: [],
      });
      const ms = navigator.mediaSession;
      try {
        ms.setActionHandler('play', () => {
          void resumeRef.current?.();
        });
        ms.setActionHandler('pause', () => pauseRef.current?.());
        ms.setActionHandler('seekbackward', () =>
          skipBackRef.current?.(15),
        );
        ms.setActionHandler('seekforward', () =>
          skipForwardRef.current?.(30),
        );
        ms.setActionHandler('previoustrack', () => {
          void playPreviousRef.current?.();
        });
        ms.setActionHandler('nexttrack', () => {
          void playNextRef.current?.();
        });
        ms.setActionHandler('seekto', (details) => {
          if (details.seekTime != null) seekToRef.current?.(details.seekTime);
        });
      } catch {
        // older browsers may not support all handlers
      }
    },
    [],
  );

  // forward refs so MediaSession handlers can call latest closures
  const resumeRef = useRef<() => Promise<void>>();
  const pauseRef = useRef<() => void>();
  const skipBackRef = useRef<(s?: number) => void>();
  const skipForwardRef = useRef<(s?: number) => void>();
  const playNextRef = useRef<() => Promise<void>>();
  const playPreviousRef = useRef<() => Promise<void>>();
  const seekToRef = useRef<(s: number) => void>();

  const loadIntoElement = useCallback(
    async (track: Track, autoPlay: boolean, seekSeconds = 0) => {
      revokeUrl();
      const url = URL.createObjectURL(track.blob);
      objectUrlRef.current = url;

      // pause whichever element isn't being used
      const audio = audioRef.current;
      const video = videoRef.current;
      const target = track.media_type === 'video' ? video : audio;
      const other = track.media_type === 'video' ? audio : video;
      if (other) {
        other.pause();
        other.removeAttribute('src');
        other.load();
      }
      if (!target) return;

      target.src = url;
      target.playbackRate = playbackRate;
      // wait for metadata to seek reliably; remove any pending handler
      // from a previous load so it can't fire against this new src
      const pending = pendingLoadedMetaRef.current;
      if (pending) {
        pending.el.removeEventListener('loadedmetadata', pending.handler);
        pendingLoadedMetaRef.current = null;
      }
      const onLoaded = async () => {
        target.removeEventListener('loadedmetadata', onLoaded);
        if (pendingLoadedMetaRef.current?.handler === onLoaded) {
          pendingLoadedMetaRef.current = null;
        }
        if (seekSeconds > 0 && isFinite(target.duration)) {
          try {
            target.currentTime = Math.min(seekSeconds, target.duration - 0.5);
          } catch {
            /* noop */
          }
        }
        if (autoPlay) {
          try {
            await target.play();
          } catch {
            setIsPlaying(false);
          }
        }
      };
      pendingLoadedMetaRef.current = { el: target, handler: onLoaded };
      target.addEventListener('loadedmetadata', onLoaded);
      target.load();

      setCurrentTrack(track);
      setCurrentTime(seekSeconds);
      setDuration(track.duration_seconds ?? 0);
      setMediaSession(track);
      void setAppState('current_track_id', track.id);
    },
    [playbackRate, revokeUrl, setMediaSession],
  );

  const play = useCallback(
    async (track: Track, queueRest?: Track[]) => {
      if (track.media_type === 'audio') {
        getAudioAnalyser();
        void audioCtxRef.current?.resume();
      }
      if (currentTrack && currentTrack.id !== track.id) {
        playedHistoryRef.current.push(currentTrack.id);
        if (playedHistoryRef.current.length > 50) {
          playedHistoryRef.current.shift();
        }
      }
      if (queueRest) {
        setQueue(queueRest);
        void setAppState(
          'queue',
          queueRest.map((t) => t.id),
        );
      }
      await loadIntoElement(track, true, track.last_position_seconds || 0);
    },
    [currentTrack, loadIntoElement, getAudioAnalyser],
  );

  const pause = useCallback(() => {
    const el = activeMediaEl(currentTrack);
    el?.pause();
  }, [activeMediaEl, currentTrack]);

  const resume = useCallback(async () => {
    const el = activeMediaEl(currentTrack);
    if (!el) return;
    if (currentTrack?.media_type === 'audio') {
      getAudioAnalyser();
      void audioCtxRef.current?.resume();
    }
    try {
      await el.play();
    } catch {
      /* user gesture required */
    }
  }, [activeMediaEl, currentTrack, getAudioAnalyser]);

  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else void resume();
  }, [isPlaying, pause, resume]);

  const seekTo = useCallback(
    (seconds: number) => {
      const el = activeMediaEl(currentTrack);
      if (!el || !isFinite(el.duration)) return;
      el.currentTime = Math.max(0, Math.min(seconds, el.duration));
      setCurrentTime(el.currentTime);
    },
    [activeMediaEl, currentTrack],
  );

  const skipForward = useCallback(
    (seconds = 30) => {
      const el = activeMediaEl(currentTrack);
      if (!el) return;
      seekTo(el.currentTime + seconds);
    },
    [activeMediaEl, currentTrack, seekTo],
  );

  const skipBack = useCallback(
    (seconds = 15) => {
      const el = activeMediaEl(currentTrack);
      if (!el) return;
      seekTo(el.currentTime - seconds);
    },
    [activeMediaEl, currentTrack, seekTo],
  );

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
    if (videoRef.current) videoRef.current.playbackRate = rate;
    void setAppState('playback_rate', rate);
  }, []);

  const addToQueue = useCallback((track: Track) => {
    setQueue((q) => {
      if (q.some((t) => t.id === track.id)) return q;
      const next = [...q, track];
      void setAppState(
        'queue',
        next.map((t) => t.id),
      );
      return next;
    });
  }, []);

  const removeFromQueue = useCallback((index: number) => {
    setQueue((q) => {
      const next = q.filter((_, i) => i !== index);
      void setAppState(
        'queue',
        next.map((t) => t.id),
      );
      return next;
    });
  }, []);

  const reorderQueue = useCallback((from: number, to: number) => {
    setQueue((q) => {
      if (from === to || from < 0 || to < 0 || from >= q.length || to >= q.length)
        return q;
      const next = q.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      void setAppState(
        'queue',
        next.map((t) => t.id),
      );
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    void setAppState('queue', []);
  }, []);

  const queueRef = useRef<Track[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const playNext = useCallback(async () => {
    const q = queueRef.current;
    if (q.length === 0) return;
    const [head, ...rest] = q;
    setQueue(rest);
    void setAppState('queue', rest.map((t) => t.id));
    if (currentTrack && currentTrack.id !== head.id) {
      playedHistoryRef.current.push(currentTrack.id);
      if (playedHistoryRef.current.length > 50) {
        playedHistoryRef.current.shift();
      }
    }
    await loadIntoElement(head, true, 0);
  }, [currentTrack, loadIntoElement]);

  const playPrevious = useCallback(async () => {
    const hist = playedHistoryRef.current;
    if (hist.length === 0) {
      const el = activeMediaEl(currentTrack);
      if (el) el.currentTime = 0;
      return;
    }
    const prevId = hist.pop()!;
    const prev = await getTrack(prevId);
    if (!prev) return;
    await loadIntoElement(prev, true, 0);
  }, [activeMediaEl, currentTrack, loadIntoElement]);

  const jumpToQueueIndex = useCallback(
    async (index: number) => {
      const q = queueRef.current;
      if (index < 0 || index >= q.length) return;
      const target = q[index];
      const rest = q.slice(index + 1);
      setQueue(rest);
      void setAppState('queue', rest.map((t) => t.id));
      if (currentTrack && currentTrack.id !== target.id) {
        playedHistoryRef.current.push(currentTrack.id);
        if (playedHistoryRef.current.length > 50) {
          playedHistoryRef.current.shift();
        }
      }
      await loadIntoElement(target, true, 0);
    },
    [currentTrack, loadIntoElement],
  );

  // keep refs current
  useEffect(() => {
    resumeRef.current = resume;
    pauseRef.current = pause;
    skipBackRef.current = skipBack;
    skipForwardRef.current = skipForward;
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
    seekToRef.current = seekTo;
  });

  // attach media element listeners
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio || !video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = (e: Event) => {
      const t = (e.target as HTMLMediaElement).currentTime;
      setCurrentTime(t);
      const now = Date.now();
      if (now - lastSaveRef.current > SAVE_INTERVAL_MS) {
        lastSaveRef.current = now;
        if (currentTrack) {
          void updateTrackFields(currentTrack.id, {
            last_position_seconds: t,
          });
        }
      }
    };
    const onLoadedMeta = (e: Event) => {
      const el = e.target as HTMLMediaElement;
      const dur = el.duration;
      if (isFinite(dur) && dur > 0) {
        setDuration(dur);
        if (currentTrack && currentTrack.duration_seconds == null) {
          void updateTrackFields(currentTrack.id, { duration_seconds: dur });
        }
      }
    };
    const onEnded = () => {
      if (currentTrack) {
        void updateTrackFields(currentTrack.id, {
          last_position_seconds: 0,
          last_played_at: Date.now(),
        });
      }
      void playNextRef.current?.();
    };
    const onRateChange = (e: Event) => {
      const r = (e.target as HTMLMediaElement).playbackRate;
      setPlaybackRateState(r);
    };

    const els = [audio, video];
    for (const el of els) {
      el.addEventListener('play', onPlay);
      el.addEventListener('pause', onPause);
      el.addEventListener('timeupdate', onTime);
      el.addEventListener('loadedmetadata', onLoadedMeta);
      el.addEventListener('ended', onEnded);
      el.addEventListener('ratechange', onRateChange);
    }
    return () => {
      for (const el of els) {
        el.removeEventListener('play', onPlay);
        el.removeEventListener('pause', onPause);
        el.removeEventListener('timeupdate', onTime);
        el.removeEventListener('loadedmetadata', onLoadedMeta);
        el.removeEventListener('ended', onEnded);
        el.removeEventListener('ratechange', onRateChange);
      }
    };
  }, [currentTrack]);

  // resume on mount: load current_track_id paused
  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    (async () => {
      try {
        const rate = await getAppState('playback_rate');
        if (typeof rate === 'number' && rate > 0) {
          setPlaybackRateState(rate);
        }
        const queueIds = await getAppState('queue');
        if (Array.isArray(queueIds) && queueIds.length > 0) {
          const tracks: Track[] = [];
          for (const id of queueIds) {
            const t = await getTrack(id);
            if (t) tracks.push(t);
          }
          setQueue(tracks);
        }
        const currentId = await getAppState('current_track_id');
        if (typeof currentId === 'number') {
          const t = await getTrack(currentId);
          if (t) {
            await loadIntoElement(t, false, t.last_position_seconds || 0);
          }
        }
      } catch {
        /* noop */
      }
    })();
  }, [loadIntoElement]);

  const [videoHostEl, setVideoHostEl] = useState<HTMLDivElement | null>(null);

  // video portal: move video element between hidden home and host on demand
  useEffect(() => {
    const video = videoRef.current;
    const home = videoHomeRef.current;
    if (!video || !home) return;
    if (currentTrack?.media_type === 'video' && videoHostEl) {
      if (video.parentElement !== videoHostEl) {
        videoHostEl.appendChild(video);
        Object.assign(video.style, {
          position: '',
          width: '100%',
          height: '100%',
          opacity: '1',
          pointerEvents: 'auto',
          left: '',
          top: '',
        });
      }
    } else {
      if (video.parentElement !== home) {
        home.appendChild(video);
        Object.assign(video.style, VIDEO_HIDDEN_STYLE as Record<string, string>);
      }
    }
  }, [currentTrack, videoHostEl]);

  const setVideoHost = useCallback((el: HTMLDivElement | null) => {
    videoHostRef.current = el;
    setVideoHostEl(el);
  }, []);

  const value = useMemo<PlayerContextValue>(
    () => ({
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      playbackRate,
      queue,
      videoHostRef,
      setVideoHost,
      play,
      pause,
      resume,
      toggle,
      seekTo,
      skipForward,
      skipBack,
      setPlaybackRate,
      addToQueue,
      removeFromQueue,
      reorderQueue,
      playNext,
      playPrevious,
      clearQueue,
      jumpToQueueIndex,
      getAudioAnalyser,
    }),
    [
      currentTrack,
      isPlaying,
      currentTime,
      duration,
      playbackRate,
      queue,
      setVideoHost,
      play,
      pause,
      resume,
      toggle,
      seekTo,
      skipForward,
      skipBack,
      setPlaybackRate,
      addToQueue,
      removeFromQueue,
      reorderQueue,
      playNext,
      playPrevious,
      clearQueue,
      jumpToQueueIndex,
      getAudioAnalyser,
    ],
  );

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* Persistent media elements — must never unmount */}
      <audio ref={audioRef} playsInline preload="metadata" />
      <div ref={videoHomeRef} style={VIDEO_HIDDEN_STYLE} aria-hidden>
        <video ref={videoRef} playsInline preload="metadata" style={VIDEO_HIDDEN_STYLE} />
      </div>
    </PlayerContext.Provider>
  );
}
