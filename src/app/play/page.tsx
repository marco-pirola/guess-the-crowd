"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorState } from "@/components/ErrorState";
import { getRecentQuestionIds } from "@/lib/recentQuestions";

/**
 * Every fresh visit to /play must land on a brand-new random question, never
 * a stale completed one. This used to redirect to a fixed "daily" question
 * id (same for every player, all day) — if you'd already finished it, the
 * result already existed server-side, so re-entering just reopened it. Using
 * the same random-pick endpoint "Next question" uses (minus recently seen
 * ids from this device) guarantees a fresh start instead.
 */
export default function PlayPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function pickAndGo() {
      setFailed(false);
      try {
        const recent = getRecentQuestionIds();
        const params = new URLSearchParams({ recent: recent.join(",") });
        const res = await fetch(`/api/questions/next?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to pick a question");
        const data: { id: string } = await res.json();
        if (cancelled) return;
        router.replace(`/challenge/${data.id}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    pickAndGo();
    return () => {
      cancelled = true;
    };
  }, [router, attempt]);

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:py-12">
        {failed ? (
          <ErrorState
            message="Couldn't start a new question. Try again."
            onRetry={() => setAttempt((n) => n + 1)}
          />
        ) : (
          <LoadingSpinner label="Finding a question…" />
        )}
      </main>
    </>
  );
}
