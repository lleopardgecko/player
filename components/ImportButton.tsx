'use client';

import { useRef, useState } from 'react';
import { addTrack, findDuplicate } from '@/lib/db';
import { deriveTitle, getExtension, inferMediaType } from '@/lib/format';
import type { NewTrack } from '@/lib/types';

interface Props {
  onImported: () => void;
}

export function ImportButton({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null,
  );

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;
    setProgress({ done: 0, total: files.length });
    let added = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
          added++;
        }
      } catch (err) {
        console.error('Import failed for', file.name, err);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    if (added > 0) onImported();
  };

  return (
    <>
      <button
        type="button"
        onClick={onPick}
        className="flex h-7 w-9 items-center justify-center rounded-full bg-aqua-button border border-aqua-dark text-[16px] leading-none text-white aqua-glow transition active:scale-95"
        aria-label="Import files"
      >
        +
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.oga,.opus,.webm,.mp4,.m4v,.mov"
        multiple
        onChange={onChange}
        className="hidden"
      />
      {progress && (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-metal-dark border-t border-border px-4 py-2 text-center text-[12px] text-accent shadow-lg safe-bottom">
          Importing {progress.done} of {progress.total}…
        </div>
      )}
    </>
  );
}
