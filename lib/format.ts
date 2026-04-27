import type { MediaType } from './types';

const AUDIO_EXTS = new Set([
  'm4a',
  'mp3',
  'opus',
  'ogg',
  'oga',
  'wav',
  'flac',
  'aac',
  'wma',
]);
const VIDEO_EXTS = new Set(['mp4', 'mkv', 'mov', 'avi', 'm4v']);

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const YT_BRACKET_RE = /^(.*) \[[A-Za-z0-9_-]{11}\]$/;

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return '';
  return filename.slice(dot + 1).toLowerCase();
}

export function inferMediaType(ext: string): MediaType {
  const e = ext.toLowerCase();
  if (VIDEO_EXTS.has(e)) return 'video';
  if (AUDIO_EXTS.has(e)) return 'audio';
  // webm is ambiguous → default to audio per CLAUDE.md
  return 'audio';
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length === 0) return word;
      // preserve all-caps acronyms of length <=4
      if (word.length <= 4 && word === word.toUpperCase()) return word;
      return word[0].toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function deriveTitle(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const stem = dot > 0 ? filename.slice(0, dot) : filename;
  if (YT_ID_RE.test(stem)) return stem;
  const bracket = stem.match(YT_BRACKET_RE);
  const base = bracket ? bracket[1] : stem;
  const cleaned = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  return titleCase(cleaned);
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !isFinite(seconds) || seconds < 0) return '--:--';
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (!isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  const decimals = value >= 100 ? 0 : value >= 10 ? 1 : 1;
  return `${value.toFixed(decimals)} ${units[i]}`;
}
