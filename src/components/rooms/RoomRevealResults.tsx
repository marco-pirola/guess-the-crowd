"use client";

import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeQuestion } from "@/lib/i18n/localizeQuestion";
import { PublicQuestion, VoteOption } from "@/lib/types";
import { RoomLeaderboardEntry, RoomRoundRevealed } from "@/lib/rooms/types";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/Button";
import { ScoreDisplay } from "@/components/ScoreDisplay";

function majoritySide(percentageA: number): VoteOption {
  return percentageA >= 50 ? "A" : "B";
}

export function RoomRevealResults({
  question,
  roundState,
  leaderboard,
  myPlayerId,
  isHost,
  isLastRound,
  onNext,
  busy,
  actionErrorMessage,
}: {
  question: PublicQuestion;
  roundState: RoomRoundRevealed;
  /**
   * Cumulative room standings as of this round, for the "Total: N" line
   * under each round score. Not required for the reveal itself to render —
   * if it hasn't loaded yet (or a background refresh of it failed), rows
   * just show the round score alone rather than blocking on it.
   */
  leaderboard: RoomLeaderboardEntry[] | null;
  myPlayerId: string | null;
  isHost: boolean;
  isLastRound: boolean;
  onNext: () => void;
  busy: boolean;
  actionErrorMessage: string | null;
}) {
  const { t, locale } = useLocale();
  const localized = localizeQuestion(question, locale);
  const crowdSide = majoritySide(roundState.actualPercentageA);
  const crowdPct = crowdSide === "A" ? roundState.actualPercentageA : 100 - roundState.actualPercentageA;
  const crowdLabel = crowdSide === "A" ? localized.optionA : localized.optionB;
  const crowdEmoji = crowdSide === "A" ? question.emojiA : question.emojiB;

  return (
    <GameCard className="flex w-full max-w-lg animate-fade-in-up flex-col gap-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">
          {t("room_roundResultsTitle", { n: roundState.roundNumber })}
        </p>
        <p className="text-balance text-lg font-bold">{localized.text}</p>
      </div>

      <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface-sunken p-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{t("result_theCrowd")}</p>
        <p className="flex items-center gap-2 text-xl font-extrabold text-accent">
          <span aria-hidden>{crowdEmoji}</span>
          <span>{crowdLabel}</span>
          <span className="tabular-nums">— {crowdPct}%</span>
        </p>
      </div>

      <ol className="flex flex-col gap-2">
        {roundState.results.map((result, i) => {
          const chosenLabel = result.selectedOption === "A" ? localized.optionA : localized.optionB;
          const chosenEmoji = result.selectedOption === "A" ? question.emojiA : question.emojiB;
          const isMe = result.playerId === myPlayerId;
          const isTop = i === 0;
          const totalScore = leaderboard?.find((entry) => entry.playerId === result.playerId)?.totalScore ?? null;
          return (
            <li
              key={result.playerId}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 ${
                isMe ? "border-accent bg-accent/10" : "border-border bg-surface"
              }`}
            >
              <div>
                <p className="flex items-center gap-1.5 font-medium">
                  {isTop && <span aria-hidden>🏆</span>}
                  <span>{result.nickname}</span>
                  {isMe && <span className="text-muted">{t("leaderboard_you")}</span>}
                </p>
                <p className="text-xs text-muted">
                  <span aria-hidden>{chosenEmoji}</span> {chosenLabel} ·{" "}
                  {t("room_predictedShort", { pct: result.predictedPercentageA })}
                </p>
              </div>
              <div className="flex flex-col items-end">
                <p className="flex items-baseline gap-0.5 text-xl font-extrabold tabular-nums text-accent">
                  <span aria-hidden>+</span>
                  <ScoreDisplay value={result.score} />
                </p>
                {totalScore !== null && (
                  <p className="text-xs tabular-nums text-muted">
                    {t("room_totalLabel")}: <ScoreDisplay value={totalScore} />
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {isHost ? (
        <Button onClick={onNext} loading={busy} className="w-full">
          {isLastRound ? t("room_finishGame") : t("room_nextRound")}
        </Button>
      ) : (
        <p className="text-center text-sm text-muted">{t("room_waitingForHostNext")}</p>
      )}

      {actionErrorMessage && (
        <p role="alert" className="text-center text-sm text-danger">
          {actionErrorMessage}
        </p>
      )}
    </GameCard>
  );
}
