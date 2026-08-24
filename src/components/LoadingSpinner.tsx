export function LoadingSpinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-1 animate-fade-in-up flex-col items-center justify-center gap-3 py-16 text-muted"
    >
      <span
        aria-hidden
        className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
