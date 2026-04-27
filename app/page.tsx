'use client';

import { useState } from 'react';
import { Library } from '@/components/Library';
import { MiniPlayer } from '@/components/MiniPlayer';
import { FullPlayer } from '@/components/FullPlayer';
import { usePlayer } from '@/components/PlayerProvider';

export default function Page() {
  const [view, setView] = useState<'library' | 'full'>('library');
  const { currentTrack } = usePlayer();

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden">
      <Library onOpenFullPlayer={() => setView('full')} />
      {currentTrack && view !== 'full' && (
        <MiniPlayer onExpand={() => setView('full')} />
      )}
      <FullPlayer
        open={view === 'full'}
        onCollapse={() => setView('library')}
      />
    </main>
  );
}
