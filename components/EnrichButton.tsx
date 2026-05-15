'use client';

import { useRef, useState } from 'react';
import { getAllTracks, updateTrackFields } from '@/lib/db';
import { getFileStem } from '@/lib/format';

interface Props {
  onEnriched: () => void;
}

export function EnrichButton({ onEnriched }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const onPick = () => inputRef.current?.click();

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const tracks = await getAllTracks();
    const byStem = new Map<string, number>();
    for (const t of tracks) {
      byStem.set(getFileStem(t.filename), t.id);
    }

    const infos = files.filter((f) => f.name.endsWith('.info.json'));
    const images = files.filter((f) => f.type.startsWith('image/'));
    const total = infos.length + images.length;
    if (total === 0) return;

    setProgress({ done: 0, total });
    let done = 0;
    let enriched = 0;

    for (const f of infos) {
      try {
        const stem = getFileStem(f.name);
        const id = byStem.get(stem);
        if (id != null) {
          const json = JSON.parse(await f.text()) as { duration?: number };
          if (typeof json.duration === 'number' && json.duration > 0) {
            await updateTrackFields(id, { duration_seconds: json.duration });
            enriched++;
          }
        }
      } catch {
        // skip unparseable files
      }
      setProgress({ done: ++done, total });
    }

    for (const f of images) {
      try {
        const stem = getFileStem(f.name);
        const id = byStem.get(stem);
        if (id != null) {
          await updateTrackFields(id, { thumb_blob: f });
          enriched++;
        }
      } catch {
        // skip unreadable files
      }
      setProgress({ done: ++done, total });
    }

    setProgress(null);
    if (enriched > 0) onEnriched();
  };

  return (
    <>
      <button
        type="button"
        onClick={onPick}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-[15px] text-muted active:opacity-75"
        aria-label="Enrich from catalog"
      >
        ≡
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,image/*"
        multiple
        onChange={onChange}
        className="hidden"
      />
      {progress && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white px-4 py-3 text-center text-[13px] text-accent safe-bottom">
          Enriching {progress.done} of {progress.total}…
        </div>
      )}
    </>
  );
}
