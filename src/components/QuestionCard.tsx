/**
 * The question itself, rendered above the interactive card and kept visible
 * across every phase — predicting, choosing, and revealing all answer the
 * same question, so it should never disappear or get replaced.
 */
export function QuestionCard({
  dailyNumber,
  category,
  question,
}: {
  dailyNumber: number;
  category: string;
  question: string;
}) {
  return (
    <div className="flex w-full flex-col items-center gap-3 text-center">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider">
        <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">{category}</span>
        <span className="text-muted">Challenge #{dailyNumber}</span>
      </div>
      <h1 className="text-balance max-w-md text-2xl font-extrabold leading-tight sm:text-3xl">
        {question}
      </h1>
    </div>
  );
}
