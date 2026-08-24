"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorState } from "@/components/ErrorState";
import { GameCard } from "@/components/GameCard";
import { Button } from "@/components/Button";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { DailyLeaderboard } from "@/components/DailyLeaderboard";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { track } from "@/lib/analytics";
import { DailyChallengeStatus } from "@/lib/types";

/**
 * Resolves today's (UTC) Daily Challenge and either sends the player
 * straight into their next unanswered question, or — if they already have
 * an official score for today — shows the completed summary + daily
 * leaderboard here instead of re-entering the game loop.
 */
export default function DailyPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [status, setStatus] = useState<DailyChallengeStatus | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/daily");
        if (!res.ok) throw new Error("Failed to load daily challenge");
        const data: DailyChallengeStatus = await res.json();
        if (cancelled) return;

        if (data.completed) {
          setStatus(data);
          return;
        }

        track("daily_started", { date: data.date });
        const nextId = data.questionIds[Math.min(data.answeredCount, data.questionIds.length - 1)];
        router.replace(`/daily/${nextId}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-8 sm:py-12">
        {failed ? (
          <ErrorState
            message={t("daily_startError")}
            onRetry={() => {
              setFailed(false);
              setStatus(null);
              setAttempt((n) => n + 1);
            }}
          />
        ) : !status ? (
          <LoadingSpinner label={t("daily_finding")} />
        ) : (
          <div className="flex w-full max-w-lg animate-fade-in-up flex-col items-center gap-6">
            <GameCard className="flex w-full flex-col items-center gap-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                {t("daily_completedNotice")}
              </p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  {t("daily_todaysScore")}
                </p>
                <ScoreDisplay
                  value={status.officialScore ?? 0}
                  className="mt-1 block text-4xl font-extrabold tabular-nums text-accent"
                />
              </div>
              {status.dailyRank !== null && (
                <p className="text-sm text-muted">
                  {t("daily_dailyRank")}: #{status.dailyRank}
                </p>
              )}
              <div className="flex w-full flex-col gap-3 sm:flex-row-reverse">
                <Link
                  href="/play"
                  className="flex-1 rounded-full bg-accent px-6 py-3 text-center text-base font-semibold text-accent-foreground transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
                >
                  {t("daily_playQuickPlay")}
                </Link>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => router.push(`/daily/${status.questionIds[0]}`)}
                >
                  {t("daily_replay")}
                </Button>
              </div>
            </GameCard>
            <DailyLeaderboard />
          </div>
        )}
      </main>
    </>
  );
}
