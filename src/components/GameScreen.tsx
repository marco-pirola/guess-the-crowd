"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PredictionResult, PublicQuestion, VoteOption } from "@/lib/types";
import { getRecentQuestionIds, rememberQuestionId } from "@/lib/recentQuestions";
import { track } from "@/lib/analytics";
import { QuestionCard } from "@/components/QuestionCard";
import { PhaseSteps } from "@/components/PhaseSteps";
import { GameCard } from "@/components/GameCard";
import { PredictionSlider } from "@/components/PredictionSlider";
import { AnswerOption } from "@/components/AnswerOption";
import { ResultCard } from "@/components/ResultCard";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorState } from "@/components/ErrorState";

type Phase = "loading" | "predict" | "vote" | "result" | "error";

const PHASE_STEP: Record<Phase, 0 | 1 | 2> = {
  loading: 0,
  predict: 0,
  vote: 1,
  result: 2,
  error: 0,
};

async function parseErrorCode(res: Response): Promise<string | undefined> {
  try {
    const data = await res.json();
    return data?.code;
  } catch {
    return undefined;
  }
}

export function GameScreen({ question }: { question: PublicQuestion }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [predicted, setPredicted] = useState(50);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);

  useEffect(() => {
    track("game_started", { questionId: question.id });
    rememberQuestionId(question.id);

    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/questions/${question.id}/result`);
      if (cancelled) return;
      if (res.ok) {
        const data: PredictionResult = await res.json();
        setResult(data);
        setPhase("result");
        track("result_viewed", { questionId: question.id });
        return;
      }
      const code = await parseErrorCode(res);
      setPhase(code === "VOTE_BEFORE_RESULT" ? "vote" : "predict");
    })();

    return () => {
      cancelled = true;
    };
  }, [question.id]);

  async function handleLockPrediction() {
    setBusy(true);
    setErrorMessage(null);
    track("prediction_started", { questionId: question.id });
    const res = await fetch(`/api/questions/${question.id}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictedPercentageA: predicted }),
    });
    setBusy(false);
    if (res.ok) {
      track("prediction_submitted", { questionId: question.id, value: predicted });
      setPhase("vote");
      return;
    }
    const code = await parseErrorCode(res);
    if (code === "ALREADY_PREDICTED") {
      setPhase("vote");
      return;
    }
    setErrorMessage("Couldn't lock your prediction. Try again.");
  }

  async function handleVote(option: VoteOption) {
    setBusy(true);
    setErrorMessage(null);
    const res = await fetch(`/api/questions/${question.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOption: option }),
    });
    const code = res.ok ? undefined : await parseErrorCode(res);
    if (!res.ok && code !== "ALREADY_VOTED") {
      setBusy(false);
      setErrorMessage("Couldn't submit your vote. Try again.");
      return;
    }
    track("vote_submitted", { questionId: question.id, option });

    const resultRes = await fetch(`/api/questions/${question.id}/result`);
    setBusy(false);
    if (!resultRes.ok) {
      setErrorMessage("Couldn't load the result. Try again.");
      return;
    }
    const data: PredictionResult = await resultRes.json();
    setResult(data);
    setPhase("result");
    track("result_viewed", { questionId: question.id });
  }

  async function handleNext() {
    if (advancing) return;
    setAdvancing(true);
    setErrorMessage(null);
    track("replay_clicked", { questionId: question.id });

    const recent = getRecentQuestionIds();
    const params = new URLSearchParams({ current: question.id, recent: recent.join(",") });

    try {
      const res = await fetch(`/api/questions/next?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to pick next question");
      const data: { id: string } = await res.json();
      router.push(`/challenge/${data.id}`);
    } catch {
      setAdvancing(false);
      setErrorMessage("Couldn't load the next question. Try again.");
    }
  }

  if (phase === "loading") return <LoadingSpinner label="Loading question…" />;

  if (phase === "error") {
    return <ErrorState message={errorMessage ?? undefined} onRetry={() => setPhase("predict")} />;
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <PhaseSteps current={PHASE_STEP[phase]} />
      <QuestionCard
        dailyNumber={question.dailyNumber}
        category={question.category}
        question={question.text}
      />

      {phase === "predict" && (
        <GameCard key="predict" className="flex animate-fade-in-up flex-col gap-6">
          <PredictionSlider
            value={predicted}
            onChange={setPredicted}
            optionA={question.optionA}
            optionB={question.optionB}
          />
          <Button onClick={handleLockPrediction} loading={busy} className="w-full">
            {busy ? "Locking…" : "Lock prediction"}
          </Button>
          {errorMessage && (
            <p role="alert" className="text-center text-sm text-danger">
              {errorMessage}
            </p>
          )}
        </GameCard>
      )}

      {phase === "vote" && (
        <GameCard key="vote" className="flex animate-fade-in-up flex-col gap-6">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              Now make your choice
            </p>
            <p className="mt-1 text-sm text-muted">Forget the crowd. What would YOU choose?</p>
          </div>
          <div className="flex gap-4">
            <AnswerOption
              label={question.optionA}
              emoji={question.emojiA}
              tone="a"
              disabled={busy}
              onClick={() => handleVote("A")}
            />
            <AnswerOption
              label={question.optionB}
              emoji={question.emojiB}
              tone="b"
              disabled={busy}
              onClick={() => handleVote("B")}
            />
          </div>
          {errorMessage && (
            <p role="alert" className="text-center text-sm text-danger">
              {errorMessage}
            </p>
          )}
        </GameCard>
      )}

      {phase === "result" && result && (
        <>
          <ResultCard
            question={question}
            result={result}
            onNext={handleNext}
            shareUrl={
              typeof window !== "undefined"
                ? `${window.location.origin}/challenge/${question.id}`
                : `/challenge/${question.id}`
            }
          />
          {errorMessage && (
            <p role="alert" className="text-center text-sm text-danger">
              {errorMessage}
            </p>
          )}
        </>
      )}
    </div>
  );
}
