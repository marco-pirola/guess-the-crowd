"use client";

import { PredictionResult, PublicQuestion, VoteOption } from "@/lib/types";
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

/** Good reads get the accent color; poor ones stay neutral — never alarming/red, this isn't an error state. */
function accuracyTone(error: number): string {
  return error <= 25 ? "text-accent" : "text-foreground";
}

/** One option's value within a section — emoji/label flex to fit, bar + number stay fixed-width so rows line up. */
function ValueRow({
  emoji,
  label,
  pct,
  emphasis,
}: {
  emoji: string;
  label: string;
  pct: number;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
        <span aria-hidden>{emoji}</span>
        <span className="min-w-0 text-balance break-words">{label}</span>
      </span>
      <div className="relative hidden h-2 w-16 shrink-0 rounded-full bg-border/70 sm:block">
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out ${
            emphasis ? "bg-accent" : "bg-foreground/60"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`w-11 shrink-0 text-right font-bold tabular-nums ${
          emphasis ? "text-base text-accent" : "text-sm"
        }`}
      >
        {pct}%
      </span>
    </div>
  );
}

/**
 * A titled group of both options' values — the crowd's actual split, or the
 * player's predicted split, never mixed in the same row. Crowd comes first
 * and is visually heavier (accent bars/number): it's the payoff, the
 * prediction is the comparison point underneath it. Option order within a
 * section (optionA, then optionB) is fixed and must never change based on
 * percentages or the player's choice — see AGENTS.md.
 */
function ResultSection({
  title,
  emphasis,
  options,
}: {
  title: string;
  emphasis?: boolean;
  options: { key: VoteOption; emoji: string; label: string; pct: number }[];
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        emphasis ? "border-accent/25 bg-accent-soft" : "border-border bg-surface-sunken"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-wider ${
          emphasis ? "text-accent" : "text-muted"
        }`}
      >
        {title}
      </p>
      <div className="mt-3 flex flex-col gap-2.5">
        {options.map((opt) => (
          <ValueRow key={opt.key} emoji={opt.emoji} label={opt.label} pct={opt.pct} emphasis={emphasis} />
        ))}
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
  const shareText = t("share_text", { score: result.score });

  const chosen = question[result.chosenOption === "A" ? "optionA" : "optionB"];
  const chosenEmoji = question[result.chosenOption === "A" ? "emojiA" : "emojiB"];

  const crowdOptions: { key: VoteOption; emoji: string; label: string; pct: number }[] = [
    { key: "A", emoji: question.emojiA, label: question.optionA, pct: result.actualPercentageA },
    { key: "B", emoji: question.emojiB, label: question.optionB, pct: 100 - result.actualPercentageA },
  ];
  const predictionOptions: { key: VoteOption; emoji: string; label: string; pct: number }[] = [
    { key: "A", emoji: question.emojiA, label: question.optionA, pct: result.predictedPercentageA },
    { key: "B", emoji: question.emojiB, label: question.optionB, pct: 100 - result.predictedPercentageA },
  ];

  return (
    <GameCard className="flex animate-fade-in-up flex-col gap-6">
      <p className="text-center text-lg font-bold">{t(resultMessageKey(result.error))}</p>

      <div className="flex flex-col gap-3">
        <ResultSection title={t("result_theCrowd")} emphasis options={crowdOptions} />
        <ResultSection title={t("result_yourPrediction")} options={predictionOptions} />
      </div>

      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("result_youChoseLabel")}
        </p>
        <span className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-soft px-3 py-1 text-sm font-semibold text-accent">
          <span aria-hidden>{chosenEmoji}</span>
          <span className="text-balance break-words">{chosen}</span>
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 border-y border-border py-5 text-center">
        <p className={`text-xl font-extrabold ${accuracyTone(result.error)}`}>
          {result.error === 0
            ? t("result_spotOn")
            : t(result.error === 1 ? "result_pointsOffOne" : "result_pointsOffMany", { n: result.error })}
        </p>
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
