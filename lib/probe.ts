import type { MediaType } from './types';

export function probeDuration(
  blob: Blob,
  type: MediaType,
): Promise<number | null> {
  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    const el = document.createElement(
      type === 'video' ? 'video' : 'audio',
    ) as HTMLMediaElement;
    el.preload = 'metadata';
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      el.removeAttribute('src');
      try {
        el.load();
      } catch {
        /* noop */
      }
      resolve(value);
    };
    el.addEventListener('loadedmetadata', () => {
      const d = isFinite(el.duration) && el.duration > 0 ? el.duration : null;
      finish(d);
    });
    el.addEventListener('error', () => finish(null));
    setTimeout(() => finish(null), 8000);
    el.src = url;
  });
}
