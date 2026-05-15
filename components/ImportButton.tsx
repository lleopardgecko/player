'use client';

import { useRef, useState } from 'react';
import { addTrack, findDuplicate, getAllTracks, updateTrackFields } from '@/lib/db';
import { deriveTitle, getExtension, getFileStem, inferMediaType } from '@/lib/format';
import type { NewTrack } from '@/lib/types';

interface Props {
  onImported: () => void;
}

export function ImportButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const mediaFiles = files.filter(
      (f) => !f.name.endsWith('.info.json') && !f.type.startsWith('image/'),
    );
    const infos = files.filter((f) => f.name.endsWith('.info.json'));
    const images = files.filter((f) => f.type.startsWith('image/'));

    setProgress({ done: 0, total: files.length });
    let done = 0;
    let changed = 0;

    for (const file of mediaFiles) {
      try {
        const dup = await findDuplicate(file.name, file.size);
        if (!dup) {
          const ext = getExtension(file.name);
          const track: NewTrack = {
            filename: file.name,
            title: deriveTitle(file.name),
            media_type: inferMediaType(ext),
            file_ext: ext,
            file_size_bytes: file.size,
            blob: file,
            thumb_blob: null,
            duration_seconds: null,
            added_at: Date.now(),
            last_played_at: null,
            last_position_seconds: 0,
          };
          await addTrack(track);
          changed++;
        }
      } catch (err) {
        console.error('Import failed for', file.name, err);
      }
      setProgress({ done: ++done, total: files.length });
    }

    if (infos.length > 0 || images.length > 0) {
      const tracks = await getAllTracks();
      const byStem = new Map<string, number>();
      for (const t of tracks) {
        byStem.set(getFileStem(t.filename), t.id);
      }

      for (const f of infos) {
        try {
          const id = byStem.get(getFileStem(f.name));
          if (id != null) {
            const json = JSON.parse(await f.text()) as { duration?: number };
            if (typeof json.duration === 'number' && json.duration > 0) {
              await updateTrackFields(id, { duration_seconds: json.duration });
              changed++;
            }
          }
        } catch {}
        setProgress({ done: ++done, total: files.length });
      }

      for (const f of images) {
        try {
          const id = byStem.get(getFileStem(f.name));
          if (id != null) {
            await updateTrackFields(id, { thumb_blob: f });
            changed++;
          }
        } catch {}
        setProgress({ done: ++done, total: files.length });
      }
    }

    setProgress(null);
    if (changed > 0) onImported();
  };

  return (
    <>
      <button
        type="button"
        onClick={onPick}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-[22px] leading-none text-white active:opacity-75"
        aria-label="Import files"
      >
        +
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.webm,.mp4,.m4v,.mov,.json,image/*"
        multiple
        onChange={onChange}
        className="hidden"
      />
      {progress && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white px-4 py-3 text-center text-[13px] text-accent safe-bottom">
          Importing {progress.done} of {progress.total}…
        </div>
      )}
    </>
  );
}
