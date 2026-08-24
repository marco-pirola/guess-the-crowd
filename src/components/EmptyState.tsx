export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex animate-fade-in-up flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
      <p className="font-medium">{title}</p>
      {description && <p className="text-sm text-muted">{description}</p>}
    </div>
  );
}
