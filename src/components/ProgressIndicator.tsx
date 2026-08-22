export function ProgressIndicator({
  dailyNumber,
  category,
}: {
  dailyNumber: number;
  category: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
      <span>Crowd Challenge #{dailyNumber}</span>
      <span aria-hidden>·</span>
      <span>{category}</span>
    </div>
  );
}
