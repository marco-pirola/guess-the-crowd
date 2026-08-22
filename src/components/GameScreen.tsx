"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PredictionResult, PublicQuestion, VoteOption } from "@/lib/types";
import { getNextQuestionId } from "@/lib/dailyChallenge";
import { track } from "@/lib/analytics";
import { QuestionCard } from "@/components/QuestionCard";
import { PredictionSlider } from "@/components/PredictionSlider";
import { AnswerOption } from "@/components/AnswerOption";
import { ResultCard } from "@/components/ResultCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorState } from "@/components/ErrorState";

type Phase = "loading" | "predict" | "vote" | "result" | "error";

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

  useEffect(() => {
    track("game_started", { questionId: question.id });

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

  function handleNext() {
    track("replay_clicked", { questionId: question.id });
    router.push(`/challenge/${getNextQuestionId(question.id)}`);
  }

  if (phase === "loading") return <LoadingSpinner label="Loading question…" />;

  if (phase === "error") {
    return <ErrorState message={errorMessage ?? undefined} onRetry={() => setPhase("predict")} />;
  }

  if (phase === "result" && result) {
    return (
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
    );
  }

  if (phase === "vote") {
    return (
      <QuestionCard
        dailyNumber={question.dailyNumber}
        category={question.category}
        question="Now choose your answer."
      >
        <div className="flex gap-4">
          <AnswerOption
            label={question.optionA}
            emoji={question.emojiA}
            disabled={busy}
            onClick={() => handleVote("A")}
          />
          <AnswerOption
            label={question.optionB}
            emoji={question.emojiB}
            disabled={busy}
            onClick={() => handleVote("B")}
          />
        </div>
        {errorMessage && <p className="text-center text-sm text-red-500">{errorMessage}</p>}
      </QuestionCard>
    );
  }

  return (
    <QuestionCard
      dailyNumber={question.dailyNumber}
      category={question.category}
      question={question.text}
    >
      <PredictionSlider
        value={predicted}
        onChange={setPredicted}
        optionA={question.optionA}
        optionB={question.optionB}
      />
      <button
        type="button"
        onClick={handleLockPrediction}
        disabled={busy}
        className="w-full rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Locking…" : "Lock prediction"}
      </button>
      {errorMessage && <p className="text-center text-sm text-red-500">{errorMessage}</p>}
    </QuestionCard>
  );
}
