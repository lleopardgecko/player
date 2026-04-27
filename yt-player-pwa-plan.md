# YT Player PWA — Implementation Plan

## Overview

A Progressive Web App deployed to Vercel that plays audio and video files from the user's device. Files are selected via the system file picker (pointing at an iCloud Drive folder), cached in IndexedDB for persistence, and played through a purpose-built player with background playback support.

There is no backend. No database. No API. This is a fully static client-side app.

---

## User Flow

1. User downloads media with yt-dlp on their Mac. Files land in an iCloud Drive folder.
2. iCloud syncs the files to their iPhone.
3. User opens the PWA on their phone.
4. First time: user taps "+" and selects all their media files from the iCloud folder.
5. The PWA reads each file, stores it in IndexedDB, and extracts what metadata it can.
6. Files appear in the library. User taps to play.
7. When new files are added later, user taps "+" and selects only the new files. Existing library persists.

---

## Tech Stack

- **Framework**: Next.js (App Router) with static export (`output: 'export'` in next.config)
- **Styling**: Tailwind CSS
- **Storage**: IndexedDB via `idb` library (lightweight wrapper around the IndexedDB API)
- **State**: React context for player state, IndexedDB for persistent library
- **PWA**: Manual service worker + web manifest for installability

Since there's no backend, use `output: 'export'` in Next.js config to produce a fully static site. No server-side rendering, no API routes, no serverless functions. This keeps the Vercel deployment on the free tier with zero cold starts.

---

## IndexedDB Schema

Single database: `yt-player`

### Object Store: `tracks`

```
Key: auto-incrementing id

{
  id: number,                    // auto-generated
  filename: string,              // original filename from file picker
  title: string,                 // derived from filename (strip extension, replace underscores/hyphens)
  media_type: "audio" | "video", // inferred from file extension
  file_ext: string,              // "m4a", "mp4", "webm", etc.
  file_size_bytes: number,
  blob: Blob,                    // the actual file data
  thumb_blob: Blob | null,       // extracted thumbnail if available (null for v1)
  duration_seconds: number | null, // populated after first play via audio/video element
  added_at: number,              // Date.now() timestamp
  last_played_at: number | null,
  last_position_seconds: number, // resume position, default 0
}
```

### Object Store: `app_state`

```
Key: string

Stores singleton values:
- "queue": number[]              // array of track IDs in queue order
- "current_track_id": number | null
- "playback_rate": number        // default 1
```

### Why IndexedDB and not localStorage

localStorage has a ~5MB limit and can only store strings. Media files are tens or hundreds of megabytes. IndexedDB can store Blobs directly and has a much higher storage quota (typically 50%+ of available disk on iOS Safari, prompted if exceeding a threshold). This is the only viable option for caching media files client-side.

---

## File Import Logic

### Importing files

When the user taps "+", open a file input with `accept="audio/*,video/*"` and `multiple` enabled. On iOS, this opens the system file picker which can navigate to iCloud Drive.

For each selected file:

1. Check if a track with the same `filename` and `file_size_bytes` already exists in IndexedDB. If so, skip (avoids duplicates on re-import).
2. Read the file as a Blob.
3. Infer `media_type` from extension:
   - Audio: m4a, mp3, opus, ogg, wav, flac, aac, wma, webm (audio)
   - Video: mp4, mkv, webm (video), mov, avi
   - For ambiguous extensions like webm, default to audio.
4. Derive `title` from filename: strip extension, replace underscores and hyphens with spaces, apply title case. If the filename starts with a YouTube ID pattern (11 chars of alphanumeric + hyphen + underscore), strip it.
5. Store the track object in IndexedDB.
6. Show import progress (e.g., "Adding 3 of 12...").

### Storage management

Include a "Storage" section in settings that shows:
- Number of tracks
- Total storage used (sum of all blob sizes)
- "Clear library" button (deletes all tracks from IndexedDB)
- Per-track delete (swipe-to-delete in library list)

---

## Pages & Views

The app is a single-page application with three visual states. Use React state to manage which view is shown — no client-side routing needed since this is a static export.

### Library View (default)

This is the main screen.

**Top bar:**
- App title / logo
- "+" button to import files (opens file picker)

**Filter tabs:**
- All | Audio | Video
- Active tab filters the list below

**Search:**
- Client-side text filter by title
- Debounced input, filters as you type

**Track list:**
- Scrollable vertical list
- Each row shows:
  - Title (derived from filename)
  - Media type icon/badge (audio or video)
  - Duration (once known, after first play or metadata load)
  - File size (human-readable, e.g., "43 MB")
- Tap a row → starts playback, shows full player
- Swipe left on a row → reveals "delete" and "add to queue" actions

**Empty state:**
- Shown when no tracks in library
- "Tap + to add files from your phone" with an arrow pointing to the button

### Full Player View (overlay)

Slides up from the bottom when a track is playing and the user taps the mini-player or starts a new track.

**Layout (audio tracks):**
- Large area at top: either a waveform-style visualization, or a stylized display of the track title. Keep it simple — no album art is available in v1.
- Track title (large)
- File info subtitle (format, size)

**Layout (video tracks):**
- `<video>` element fills the top area
- `playsinline` attribute required for iOS
- Fullscreen toggle button

**Controls (both layouts):**
- Scrubber / progress bar with current time and total duration
  - Draggable thumb
  - Tap anywhere on the bar to seek
- Main control row: skip back 15s | previous track | play/pause | next track | skip forward 30s
- Secondary row: speed control | queue button
- Speed options: 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x (current speed displayed, tap to cycle or open picker)

**Dismiss:**
- Swipe down or tap a "collapse" chevron to minimize to mini-player

### Mini Player (persistent bar)

When audio is playing and the full player is collapsed, a bar sits at the bottom of the library view.

- Shows: track title (truncated) | play/pause button
- Tap the bar (not the button) → expands to full player
- Must not interfere with the track list scrolling

### Queue View (sub-view of full player)

Accessible by tapping the queue button in the full player.

- Shows ordered list of upcoming tracks
- Current track highlighted at top (not removable)
- Drag handles to reorder
- Swipe to remove individual tracks
- "Clear queue" button
- Tap a track in queue → jumps to it

---

## Audio/Video Element Architecture

### Critical: persistent media element

The `<audio>` (or `<video>`) element MUST live in the root layout component and never unmount during view transitions. If it unmounts, iOS kills playback immediately — no background audio, no lock screen controls, nothing.

**Implementation:**

Create a `PlayerProvider` component that wraps the entire app. It renders a hidden `<audio>` element (and a hidden `<video>` element). The full player view doesn't contain its own media element — it controls the one in the provider via refs and context.

For video tracks, the hidden `<video>` element's stream is connected to a visible `<video>` element in the full player view using `captureStream()` or by simply moving the element into the player DOM via a React portal.

Simpler alternative for video: use a single `<video>` element in the provider. When the full player is open for a video track, use a React portal to render the `<video>` element inside the player layout. When collapsed, the video continues playing but is visually hidden. This avoids the complexity of stream capture.

### PlayerContext

```typescript
interface PlayerContextValue {
  // State
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  queue: Track[];

  // Actions
  play: (track: Track) => void;
  pause: () => void;
  resume: () => void;
  seekTo: (seconds: number) => void;
  skipForward: (seconds?: number) => void;  // default 30s
  skipBack: (seconds?: number) => void;     // default 15s
  setPlaybackRate: (rate: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  clearQueue: () => void;
}
```

When `play(track)` is called:
1. Create an object URL from the track's Blob (`URL.createObjectURL(track.blob)`)
2. Set it as the `src` on the media element
3. Call `.play()` on the media element
4. Update Media Session metadata
5. Revoke the previous object URL to free memory

When a track ends:
1. Save `last_position_seconds = 0` and `last_played_at` to IndexedDB
2. If queue has a next track, play it
3. If queue is empty, stop playback

Periodically (every 5 seconds during playback):
1. Save `last_position_seconds` and `currentTime` to IndexedDB for resume support

---

## Background Playback (Media Session API)

This is the most important feature. It enables:
- Continued playback when the PWA is backgrounded
- Lock screen controls (play/pause, skip, scrub)
- Control Center integration on iOS

### Implementation

In the `PlayerProvider`, whenever a track starts playing:

```typescript
if ('mediaSession' in navigator) {
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: 'YT Player',     // or could be blank
    album: '',
    artwork: []               // no artwork in v1
  });

  navigator.mediaSession.setActionHandler('play', () => resume());
  navigator.mediaSession.setActionHandler('pause', () => pause());
  navigator.mediaSession.setActionHandler('seekbackward', () => skipBack(15));
  navigator.mediaSession.setActionHandler('seekforward', () => skipForward(30));
  navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
  navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
  navigator.mediaSession.setActionHandler('seekto', (details) => {
    if (details.seekTime != null) seekTo(details.seekTime);
  });
}
```

### iOS-specific requirements

- The `<audio>` element must have the `playsinline` attribute
- Playback must be initiated by a user gesture (tap) — cannot autoplay
- The media element must remain in the DOM (never unmount)
- Object URLs work for media src on iOS Safari

---

## PWA Configuration

### manifest.json

```json
{
  "name": "YT Player",
  "short_name": "YT Player",
  "description": "Local media player",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker

Minimal service worker that caches the app shell (HTML, CSS, JS) so the PWA loads offline. Media files are already in IndexedDB, not in the service worker cache.

```javascript
const CACHE_NAME = 'yt-player-v1';
const SHELL_FILES = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

Register the service worker in the app's entry point.

---

## Design Direction

- **Dark theme** — this is a media player, used on a phone, often at night
- **Minimal chrome** — large touch targets, generous spacing, no unnecessary decoration
- Emphasis on the track list as the primary interface — it should feel fast to scroll and tap
- Full player should feel expansive — use the full screen height
- Smooth slide-up/slide-down transition between mini-player and full player (CSS transform with transition, not re-mount)
- System font stack is fine — content (track names) is the identity, not the typography
- Color palette: near-black background, white text, one accent color for interactive elements (play button, progress bar, active states)

---

## File Structure

```
app/
  layout.tsx              — Root layout, metadata, font loading
  page.tsx                — Main page, renders Library + MiniPlayer + FullPlayer

components/
  PlayerProvider.tsx       — Context provider, persistent audio/video element, Media Session API, all playback logic
  Library.tsx              — Track list with search and filter tabs
  TrackRow.tsx             — Single track in the list (title, badge, duration, size)
  FullPlayer.tsx           — Expanded player overlay with controls
  MiniPlayer.tsx           — Collapsed player bar at bottom
  QueueView.tsx            — Queue management sub-view
  SpeedControl.tsx         — Playback speed picker
  ImportButton.tsx         — "+" button that triggers file picker and handles import
  EmptyState.tsx           — Shown when library is empty
  StorageInfo.tsx          — Storage usage display + clear/delete actions
  ProgressBar.tsx          — Scrubber / seek bar component
  VideoPortal.tsx          — React portal for rendering video in full player

lib/
  db.ts                    — IndexedDB setup and CRUD operations via `idb`
  types.ts                 — TypeScript type definitions (Track, AppState)
  format.ts                — Utility functions (format duration, format file size, derive title from filename)

public/
  manifest.json
  sw.js                    — Service worker
  icons/
    icon-192.png
    icon-512.png

next.config.js             — Static export config
tailwind.config.js
package.json
tsconfig.json
```

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^14",
    "react": "^18",
    "react-dom": "^18",
    "idb": "^8"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "tailwindcss": "^3",
    "postcss": "^8",
    "autoprefixer": "^10"
  }
}
```

No other dependencies. Keep it minimal.

---

## next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,  // required for static export
  },
};

module.exports = nextConfig;
```

---

## Implementation Notes

### Filename → title derivation

yt-dlp default output template produces filenames like `Video Title [youtube_id].ext` or with custom templates like `youtube_id.ext`. The title derivation function should handle both:

1. Strip file extension
2. If filename matches pattern `(.*) \[[\w-]{11}\]$`, extract the title portion before the bracket
3. Otherwise, if filename is exactly 11 chars of `[A-Za-z0-9_-]`, it's just a YouTube ID — display it as-is (no good title available)
4. Replace underscores and hyphens with spaces
5. Apply basic title case

### Duplicate detection on import

When importing files, check for existing tracks with the same `filename` AND `file_size_bytes`. If both match, skip the file. This lets users casually re-select files without creating duplicates, while still allowing re-import if the file was re-downloaded at a different quality (different size).

### Memory management

Object URLs created via `URL.createObjectURL()` must be revoked when no longer needed to prevent memory leaks. Revoke the previous track's object URL when a new track starts playing. Don't create object URLs for the entire library — only for the currently playing track.

### iOS Safari IndexedDB quotas

iOS Safari allocates IndexedDB storage based on available disk space. The user will get a system prompt if storage exceeds a threshold (varies by iOS version, typically around 1GB). This is fine — the user will approve it since they're explicitly importing files. If the user denies, the import should fail gracefully with a message explaining they need to allow storage.

### Resume playback

When the app opens, check `app_state` in IndexedDB for `current_track_id`. If set, load that track and seek to `last_position_seconds`. Don't autoplay — just show it in the mini-player as paused, ready to resume with one tap.

### Duration extraction

Duration isn't known at import time without decoding the file. Instead, populate it lazily: when a track is loaded into the media element, listen for the `loadedmetadata` event, read `element.duration`, and write it back to IndexedDB. After the first play, duration is always available.

---

## What This Plan Does NOT Cover

- **Mac GUI changes**: not part of this repo. The only requirement from the GUI side is that yt-dlp outputs files to a specific iCloud Drive folder. No format or naming changes are required — the PWA handles whatever filenames it receives.
- **Thumbnails / album art**: not in v1. Could be added later by embedding artwork in the media file via ffmpeg on the Mac side, then extracting it client-side.
- **Offline app shell caching**: the service worker handles this minimally. Full offline support (caching the Next.js build output) can be improved later.
- **Playlist management**: v1 has a queue (ephemeral) but no saved playlists. Could be added to IndexedDB later.
