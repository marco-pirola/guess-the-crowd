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

/** Which option a percentage-for-A number is actually favoring. */
function majoritySide(percentageA: number): VoteOption {
  return percentageA >= 50 ? "A" : "B";
}

/**
 * One half of the reveal ("The crowd" / "Your guess"): a tiny label, then a
 * single unmistakable statement — emoji, option name, percentage — read as
 * one sentence, never as a number needing a caption elsewhere to make sense.
 */
function RevealLine({
  tag,
  emoji,
  label,
  pct,
  emphasis,
}: {
  tag: string;
  emoji: string;
  label: string;
  pct: number;
  emphasis: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{tag}</p>
      <p
        className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-balance break-words ${
          emphasis
            ? "text-xl font-extrabold text-accent sm:text-2xl"
            : "text-base font-bold text-foreground sm:text-lg"
        }`}
      >
        <span aria-hidden>{emoji}</span>
        <span>{label}</span>
        <span className="tabular-nums">— {pct}%</span>
      </p>
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
  const tone = accuracyTone(result.error);

  const crowdSide = majoritySide(result.actualPercentageA);
  const crowdPct = crowdSide === "A" ? result.actualPercentageA : 100 - result.actualPercentageA;
  const guessSide = majoritySide(result.predictedPercentageA);
  const guessPct = guessSide === "A" ? result.predictedPercentageA : 100 - result.predictedPercentageA;

  return (
    <GameCard className="flex animate-fade-in-up flex-col gap-5">
      {/* THE CROWD -> YOUR GUESS: one narrative block, each half self-labeled
          so no number ever needs a legend to be understood, and the crowd
          gets the heavier visual weight since it's the reveal, not a peer
          data point next to the guess. Enters immediately (0ms) — it's the
          first beat of the reveal. */}
      <div className="flex animate-fade-in-up flex-col gap-2.5 rounded-2xl border border-border bg-surface-sunken p-5 sm:p-6">
        <RevealLine
          tag={t("result_theCrowd")}
          emoji={crowdSide === "A" ? question.emojiA : question.emojiB}
          label={crowdSide === "A" ? question.optionA : question.optionB}
          pct={crowdPct}
          emphasis
        />

        <RevealLine
          tag={t("result_yourPrediction")}
          emoji={guessSide === "A" ? question.emojiA : question.emojiB}
          label={guessSide === "A" ? question.optionA : question.optionB}
          pct={guessPct}
          emphasis={false}
        />
      </div>

      {/* HOW CLOSE: the verdict beat. Deliberately styled unlike the crowd/
          prediction statements above (uppercase, smaller) so it reads as a
          distinct "here's what that meant" beat rather than a third stat
          line — the sentence (built from the same `error` value used for
          scoring) carries the meaning on its own. */}
      <div className="flex animate-fade-in-up flex-col items-center gap-1.5 text-center [animation-delay:250ms]">
        <p className={`text-lg font-extrabold uppercase tracking-wide sm:text-xl ${tone}`}>
          {result.error === 0
            ? t("result_spotOn")
            : t(result.error === 1 ? "result_pointsOffOne" : "result_pointsOffMany", { n: result.error })}
        </p>
      </div>

      {/* SCORE: the payoff, arriving after the crowd/guess/closeness beats
          instead of leading them. The whole group (label, count-up, message)
          animates in together as one unit — no double-margin between the
          number and its caption. */}
      <div className="flex animate-count-pop flex-col items-center gap-1.5 text-center [animation-delay:400ms]">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("result_score")}</p>
        <div className="flex items-end justify-center gap-1.5">
          <ScoreDisplay
            value={result.score}
            className={`text-6xl font-extrabold leading-none tabular-nums sm:text-7xl ${tone}`}
          />
          <span className="pb-1 text-base font-semibold text-muted sm:pb-1.5 sm:text-lg">/1000</span>
        </div>
        <p className={`text-balance text-lg font-bold sm:text-xl ${tone}`}>
          {t(resultMessageKey(result.error))}
        </p>
      </div>

      {/* Secondary, quiet metadata: percentile if we have it, else the
          vote-count/seeded-data trust note. Pulled a clear ~32px away from
          the score (mt-3 stacked on the parent's gap-5) so it reads as a
          footnote, not a continuation of the score beat. */}
      <div className="mt-3 flex animate-fade-in-up flex-col items-center gap-2 text-center [animation-delay:500ms]">
        {result.percentile !== null ? (
          <span className="max-w-full text-balance rounded-2xl border border-accent/30 bg-accent-soft px-3.5 py-1.5 text-xs font-semibold text-accent">
            {t("result_percentile", { pct: result.percentile })}
          </span>
        ) : (
          <p className="text-xs text-muted">
            {result.resultSource === "seeded"
              ? t("result_seededNote")
              : t(result.totalVotes === 1 ? "result_liveNoteOne" : "result_liveNoteMany", {
                  n: result.totalVotes,
                })}
          </p>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row-reverse">
        <Button onClick={onNext} loading={advancing} className="flex-1">
          {advancing ? t("result_advancing") : t("result_nextQuestion")}
        </Button>
        <ShareButton text={shareText} url={shareUrl} />
      </div>
    </GameCard>
  );
}
