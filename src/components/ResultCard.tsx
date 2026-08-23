import { PredictionResult, PublicQuestion } from "@/lib/types";
import { GameCard } from "@/components/GameCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/Button";

/** Short, punchy copy keyed off how far the prediction landed from the crowd. */
function getResultMessage(error: number): string {
  if (error <= 2) return "Incredible read.";
  if (error <= 5) return "You read the crowd extremely well.";
  if (error <= 12) return "Nice read.";
  if (error <= 25) return "Not bad — you were close.";
  if (error <= 40) return "You misjudged the crowd a bit.";
  return "You completely missed the crowd.";
}

/** Two dots on a shared 0–100 track (optionA → optionB) — same mental model as the slider. */
function ComparisonTrack({
  predicted,
  actual,
  labelA,
  labelB,
}: {
  predicted: number;
  actual: number;
  labelA: string;
  labelB: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative h-2 rounded-full bg-border">
        <div
          aria-hidden
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-accent bg-surface transition-[left] duration-500 ease-out"
          style={{ left: `${predicted}%` }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground transition-[left] duration-500 ease-out"
          style={{ left: `${actual}%` }}
        />
      </div>
      <div className="flex justify-between text-[11px] font-medium text-muted">
        <span className="truncate">{labelA}</span>
        <span className="truncate">{labelB}</span>
      </div>
      <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-muted">
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-accent bg-surface" />
          You
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-full bg-foreground" />
          Crowd
        </span>
      </div>
    </div>
  );
}

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
    <GameCard className="flex animate-fade-in-up flex-col gap-6">
      <p className="text-center text-lg font-bold">{getResultMessage(result.error)}</p>

      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-2xl border border-accent/25 bg-accent-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Your prediction
          </p>
          <ScoreDisplay
            value={result.predictedPercentageA}
            suffix="%"
            className="mt-1 block text-4xl font-extrabold tabular-nums text-accent"
          />
        </div>
        <div className="rounded-2xl border border-border bg-surface-sunken p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">The crowd</p>
          <ScoreDisplay
            value={result.actualPercentageA}
            suffix="%"
            className="mt-1 block text-4xl font-extrabold tabular-nums"
          />
        </div>
      </div>

      <ComparisonTrack
        predicted={result.predictedPercentageA}
        actual={result.actualPercentageA}
        labelA={question.optionA}
        labelB={question.optionB}
      />

      <div className="flex items-center justify-center gap-10 border-y border-border py-5 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Error</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {result.error} pt{result.error === 1 ? "" : "s"}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Score</p>
          <ScoreDisplay
            value={result.score}
            className="mt-1 block text-4xl font-extrabold tabular-nums text-accent"
          />
        </div>
      </div>

      <div className="text-center text-sm text-muted">
        <p>
          You chose <span className="font-semibold text-foreground">{chosenLabel}</span>.
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
              : `Based on ${result.totalVotes} player${result.totalVotes === 1 ? "" : "s"}.`}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button onClick={onNext} className="flex-1">
          Next question
        </Button>
        <ShareButton text={shareText} url={shareUrl} />
      </div>
    </GameCard>
  );
}
