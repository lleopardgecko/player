'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayer } from './PlayerProvider';

interface Props {
  className?: string;
}

export function Visualizer({ className }: Props) {
  const { getAudioAnalyser, isPlaying, currentTrack } = usePlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fallbackPhaseRef = useRef(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = getAudioAnalyser();
    const data = analyser
      ? new Uint8Array(analyser.frequencyBinCount)
      : null;

    let raf = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    };

    const draw = () => {
      raf = requestAnimationFrame(draw);
      resize();
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const BARS = 36;
      const gap = w / BARS / 5;
      const barW = (w - gap * (BARS + 1)) / BARS;

      let values: number[];
      if (analyser && data && isPlaying) {
        analyser.getByteFrequencyData(data);
        const binsPerBar = Math.max(1, Math.floor(data.length / BARS));
        values = new Array(BARS);
        for (let i = 0; i < BARS; i++) {
          let sum = 0;
          const start = i * binsPerBar;
          for (let j = 0; j < binsPerBar; j++) {
            sum += data[start + j] ?? 0;
          }
          // weight higher freqs slightly so they don't get drowned out
          const weight = 1 + (i / BARS) * 0.6;
          values[i] = Math.min(255, (sum / binsPerBar) * weight) / 255;
        }
      } else {
        // idle / paused: gentle sine wave
        fallbackPhaseRef.current += 0.04;
        values = new Array(BARS);
        for (let i = 0; i < BARS; i++) {
          const v =
            0.18 +
            0.12 *
              Math.sin(fallbackPhaseRef.current + i * 0.45) *
              Math.sin(fallbackPhaseRef.current * 0.7 + i * 0.2);
          values[i] = Math.max(0.05, v);
        }
      }

      for (let i = 0; i < BARS; i++) {
        const v = values[i];
        const barH = Math.max(2, v * h * 0.95);
        const x = gap + i * (barW + gap);
        const y = h - barH;

        const grad = ctx.createLinearGradient(0, y, 0, h);
        grad.addColorStop(0, '#b8d8ff');
        grad.addColorStop(0.45, '#4d92ec');
        grad.addColorStop(0.55, '#2168c9');
        grad.addColorStop(1, '#0a4ec2');
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, barH);

        // peak cap
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillRect(x, y, barW, Math.min(2, barH));

        // reflection
        const reflH = barH * 0.28;
        const refl = ctx.createLinearGradient(0, h, 0, h + reflH);
        refl.addColorStop(0, 'rgba(74,147,236,0.35)');
        refl.addColorStop(1, 'rgba(74,147,236,0)');
        ctx.fillStyle = refl;
        ctx.fillRect(x, h, barW, reflH);
      }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [getAudioAnalyser, isPlaying, currentTrack?.id, mounted]);

  const title = currentTrack?.title ?? '';
  const initial = title.trim().charAt(0).toUpperCase() || '♪';

  if (!mounted) {
    return (
      <div
        className={`relative overflow-hidden rounded-md border border-border bg-lcd shadow-inner ${
          className ?? ''
        }`}
        suppressHydrationWarning
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-md border border-border bg-lcd shadow-inner ${
        className ?? ''
      }`}
      suppressHydrationWarning
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div className="absolute left-3 top-2 text-[9px] font-bold uppercase tracking-[0.2em] text-muted">
        Now Playing
      </div>
      <div className="absolute right-3 top-2 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            isPlaying
              ? 'bg-[#34c759] shadow-[0_0_4px_#34c759]'
              : 'bg-[#a0a0a0]'
          }`}
        />
        {isPlaying ? 'Live' : 'Idle'}
      </div>
      <div className="flex h-full items-end gap-3 px-3 pb-3 pt-9">
        <div className="flex h-full w-1/3 max-w-[140px] items-center justify-center">
          <div className="flex h-full w-full max-h-32 max-w-32 items-center justify-center rounded-md border border-border bg-[linear-gradient(135deg,#3a8eff_0%,#0a4ec2_100%)] text-[44px] font-bold text-white shadow-inner">
            <span
              className="drop-shadow-[0_1px_0_rgba(0,0,0,0.4)]"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              {initial}
            </span>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          className="h-full flex-1"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
}
