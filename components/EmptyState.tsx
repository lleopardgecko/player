export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-4 text-6xl text-aqua-dark">♪</div>
      <p className="text-[14px] font-semibold text-accent">Your library is empty</p>
      <p className="mt-2 max-w-xs text-[11px] text-muted">
        Tap the + button at the top to add audio or video files from your phone.
      </p>
    </div>
  );
}
