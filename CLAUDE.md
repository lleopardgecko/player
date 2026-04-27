# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # local dev server
npm run build     # static export to /out
npm run lint      # eslint
```

No test suite is planned for this project.

## What This Is

A fully static PWA (no backend, no API routes, no SSR) that plays local media files stored in IndexedDB. Users import files from iCloud Drive via the system file picker; the app stores the raw Blobs in IndexedDB and plays them via object URLs.

Deployed to Vercel as a static export (`output: 'export'` in next.config.js).

## Architecture

**State split:** All playback state lives in `PlayerProvider` (React context). All persistent data lives in IndexedDB (`lib/db.ts`). There is no server state, no external API, and no auth.

**Critical constraint — never unmount the media element:** The `<audio>` and `<video>` elements are rendered inside `PlayerProvider` at the root and must never unmount. iOS kills background playback the moment the element leaves the DOM. Components like `FullPlayer` do not own a media element — they read/write through `PlayerContext`.

**Video rendering:** A single `<video>` element lives in `PlayerProvider`. When the full player is open for a video track, it's rendered into the player layout via a React portal (`VideoPortal.tsx`). When collapsed, it stays hidden but keeps playing.

**Background playback:** Enabled via the Media Session API (`navigator.mediaSession`). Set metadata and all action handlers (`play`, `pause`, `seekbackward`, `seekforward`, `previoustrack`, `nexttrack`, `seekto`) whenever a track starts. This powers lock screen controls and Control Center on iOS.

**Object URL lifecycle:** `URL.createObjectURL(track.blob)` is called only for the currently playing track. The previous object URL is revoked when a new track starts to prevent memory leaks. Never create object URLs for the whole library.

**Resume on open:** On app load, check IndexedDB `app_state` for `current_track_id` and `last_position_seconds`. Load that track into the player (paused) so the user can resume with one tap. No autoplay.

**Duration:** Not available at import time. Populated lazily from `loadedmetadata` on first play, then written back to IndexedDB.

## IndexedDB Schema

Database: `yt-player`

- **`tracks`** store: auto-increment id, filename, title, media_type (`"audio"|"video"`), file_ext, file_size_bytes, blob, thumb_blob (null in v1), duration_seconds, added_at, last_played_at, last_position_seconds
- **`app_state`** store: string keys — `"queue"` (number[]), `"current_track_id"` (number|null), `"playback_rate"` (number)

## Key Implementation Details

**Filename → title:** Strip extension → if matches `(.*) \[[\w-]{11}\]$` extract the part before the bracket → replace underscores/hyphens with spaces → title case. If the filename is exactly an 11-char YouTube ID, display as-is.

**Duplicate detection on import:** Skip a file if a track with the same `filename` AND `file_size_bytes` already exists. This lets users re-select files without creating duplicates.

**Periodic position save:** Every 5 seconds during playback, write `last_position_seconds` to IndexedDB for resume support.

**iOS Safari requirements:** `playsinline` on media elements, playback only on user gesture, media element must stay in DOM.

## Views

The app is a single page with three visual states managed by React state (no client-side router):
- **Library** (default) — scrollable track list with search, filter tabs (All/Audio/Video), and "+" import button
- **FullPlayer** — slides up over the library; controls the `PlayerProvider` media element via context
- **MiniPlayer** — persistent bar at the bottom of the library while audio plays; expands to FullPlayer on tap

Queue management is a sub-view inside FullPlayer.

## Design

Dark theme (`#0a0a0a` background), white text, one accent color for interactive elements. Large touch targets. Full player uses full screen height. Slide-up/down transition between mini and full player uses CSS transform (not remount). System font stack.
