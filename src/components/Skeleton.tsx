/** Shape-matching loading placeholder. Compose these to echo the destination layout — see AGENTS loading-states pass. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}
