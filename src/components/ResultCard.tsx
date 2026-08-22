import { PredictionResult, PublicQuestion } from "@/lib/types";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ShareButton } from "@/components/ShareButton";

export function ResultCard({
  question,
  result,
  onNext,
  shareUrl,
}: {
  question: PublicQuestion;
  result: PredictionResult;
  onNext: () => void;
  shareUrl: string;
}) {
  const chosenLabel = result.chosenOption === "A" ? question.optionA : question.optionB;
  const shareText = `I scored ${result.score}/1000 predicting the crowd on Guess the Crowd. Can you beat me?`;

  return (
    <div className="flex w-full max-w-lg animate-count-pop flex-col gap-8 rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            You predicted
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{result.predictedPercentageA}%</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            The crowd chose
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{result.actualPercentageA}%</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-8 border-y border-border py-6 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Error</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {result.error} pt{result.error === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Score</p>
          <ScoreDisplay
            value={result.score}
            className="mt-1 block text-3xl font-bold tabular-nums text-accent"
          />
        </div>
      </div>

      <div className="text-center text-sm text-muted">
        <p>
          You voted <span className="font-semibold text-foreground">{chosenLabel}</span>.
        </p>
        {result.percentile !== null ? (
          <p className="mt-1">
            You predicted the crowd better than{" "}
            <span className="font-semibold text-foreground">{result.percentile}%</span> of
            players.
          </p>
        ) : (
          <p className="mt-1">
            {result.resultSource === "seeded"
              ? "Based on demo data — not enough real players yet."
              : `Based on ${result.totalVotes} real player votes so far.`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="button"
          onClick={onNext}
          className="flex-1 rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Next question
        </button>
        <ShareButton text={shareText} url={shareUrl} />
      </div>
    </div>
  );
}
