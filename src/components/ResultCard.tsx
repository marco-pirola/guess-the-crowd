"use client";

import { PredictionResult, PublicQuestion } from "@/lib/types";
import { rightPercentFromPredictedA } from "@/lib/predictionConvention";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { TranslationKey } from "@/lib/i18n/translations";
import { GameCard } from "@/components/GameCard";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { ShareButton } from "@/components/ShareButton";
import { Button } from "@/components/Button";

/** Short, punchy copy keyed off how far the prediction landed from the crowd. */
function resultMessageKey(error: number): TranslationKey {
  if (error <= 2) return "result_msgIncredible";
  if (error <= 5) return "result_msgGreat";
  if (error <= 12) return "result_msgNice";
  if (error <= 25) return "result_msgNotBad";
  if (error <= 40) return "result_msgMisjudged";
  return "result_msgMissed";
}

/**
 * Two dots on a shared 0–100 track (optionA → optionB) — same mental model
 * as the slider, so dot position must use the same left→right convention:
 * position = optionB's (right's) share, via rightPercentFromPredictedA.
 * Positioning directly off the raw optionA percentage would put the dots
 * backwards relative to the labelA/labelB ends of this exact track.
 */
function ComparisonTrack({
  predictedPercentageA,
  actualPercentageA,
  labelA,
  labelB,
}: {
  predictedPercentageA: number;
  actualPercentageA: number;
  labelA: string;
  labelB: string;
}) {
  const { t } = useLocale();
  const predicted = rightPercentFromPredictedA(predictedPercentageA);
  const actual = rightPercentFromPredictedA(actualPercentageA);

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
      <div className="flex justify-between gap-3 text-[11px] font-medium text-muted">
        <span className="text-balance break-words">{labelA}</span>
        <span className="text-balance break-words text-right">{labelB}</span>
      </div>
      <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-muted">
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full border-2 border-accent bg-surface" />
          {t("result_you")}
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden className="h-2 w-2 rounded-full bg-foreground" />
          {t("result_crowd")}
        </span>
      </div>
    </div>
  );
}

/** A titled card listing both options with their percentages — never a lone number. */
function SplitPercentCard({
  title,
  labelA,
  pctA,
  labelB,
  pctB,
  accent,
}: {
  title: string;
  labelA: string;
  pctA: number;
  labelB: string;
  pctB: number;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? "rounded-2xl border border-accent/25 bg-accent-soft p-4"
          : "rounded-2xl border border-border bg-surface-sunken p-4"
      }
    >
      <p
        className={
          "text-xs font-semibold uppercase tracking-wider " + (accent ? "text-accent" : "text-muted")
        }
      >
        {title}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 flex-1 text-balance break-words text-sm font-medium">{labelA}</span>
          <ScoreDisplay
            value={pctA}
            suffix="%"
            className={"shrink-0 text-xl font-extrabold tabular-nums " + (accent ? "text-accent" : "")}
          />
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 flex-1 text-balance break-words text-sm font-medium">{labelB}</span>
          <ScoreDisplay
            value={pctB}
            suffix="%"
            className={"shrink-0 text-xl font-extrabold tabular-nums " + (accent ? "text-accent" : "")}
          />
        </div>
      </div>
    </div>
  );
}

export function ResultCard({
  question,
  result,
  onNext,
  advancing,
  shareUrl,
}: {
  question: PublicQuestion;
  result: PredictionResult;
  onNext: () => void;
  advancing: boolean;
  shareUrl: string;
}) {
  const { t } = useLocale();
  const chosenLabel = result.chosenOption === "A" ? question.optionA : question.optionB;
  const shareText = t("share_text", { score: result.score });

  return (
    <GameCard className="flex animate-fade-in-up flex-col gap-6">
      <p className="text-center text-lg font-bold">{t(resultMessageKey(result.error))}</p>

      <div className="grid grid-cols-2 gap-3">
        <SplitPercentCard
          title={t("result_yourPrediction")}
          labelA={question.optionA}
          pctA={result.predictedPercentageA}
          labelB={question.optionB}
          pctB={100 - result.predictedPercentageA}
          accent
        />
        <SplitPercentCard
          title={t("result_theCrowd")}
          labelA={question.optionA}
          pctA={result.actualPercentageA}
          labelB={question.optionB}
          pctB={100 - result.actualPercentageA}
        />
      </div>

      <ComparisonTrack
        predictedPercentageA={result.predictedPercentageA}
        actualPercentageA={result.actualPercentageA}
        labelA={question.optionA}
        labelB={question.optionB}
      />

      <div className="text-center text-sm text-muted">
        <p>{t("result_youChose", { label: chosenLabel })}</p>
      </div>

      <div className="flex items-center justify-center gap-10 border-y border-border py-5 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("result_error")}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {t(result.error === 1 ? "result_pointsOne" : "result_pointsMany", { n: result.error })}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            {t("result_score")}
          </p>
          <ScoreDisplay
            value={result.score}
            className="mt-1 block text-4xl font-extrabold tabular-nums text-accent"
          />
        </div>
      </div>

      <div className="text-center text-sm text-muted">
        {result.percentile !== null ? (
          <p className="mt-1">{t("result_percentile", { pct: result.percentile })}</p>
        ) : (
          <p className="mt-1">
            {result.resultSource === "seeded"
              ? t("result_seededNote")
              : t(result.totalVotes === 1 ? "result_liveNoteOne" : "result_liveNoteMany", {
                  n: result.totalVotes,
                })}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button onClick={onNext} loading={advancing} className="flex-1">
          {advancing ? t("result_advancing") : t("result_nextQuestion")}
        </Button>
        <ShareButton text={shareText} url={shareUrl} />
      </div>
    </GameCard>
  );
}
