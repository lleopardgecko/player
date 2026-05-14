export function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-4 text-5xl text-border">♪</div>
      <p className="text-[15px] font-semibold text-accent">Your library is empty</p>
      <p className="mt-2 max-w-xs text-[13px] text-muted">
        Tap the + button to add audio or video files.
      </p>
    </div>
  );
}
