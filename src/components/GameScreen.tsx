"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { PredictionResult, PublicQuestion, VoteOption } from "@/lib/types";
import { getRecentQuestionIds, rememberQuestionId } from "@/lib/recentQuestions";
import { onboardingStore, markOnboardingSeen } from "@/lib/onboarding";
import { track } from "@/lib/analytics";
import { markFirstGameStarted, markQuestionCompleted } from "@/lib/analyticsProgress";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeQuestion } from "@/lib/i18n/localizeQuestion";
import { useProfile } from "@/lib/profile/ProfileContext";
import { QuestionCard } from "@/components/QuestionCard";
import { PhaseSteps } from "@/components/PhaseSteps";
import { GameCard } from "@/components/GameCard";
import { PredictionSlider } from "@/components/PredictionSlider";
import { AnswerOption } from "@/components/AnswerOption";
import { ResultCard } from "@/components/ResultCard";
import { Onboarding } from "@/components/Onboarding";
import { ProfileSetup } from "@/components/ProfileSetup";
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

/** Present only when GameScreen is rendered inside the Daily Challenge flow (see /daily/[id]/page.tsx). */
export interface DailyContext {
  /** The fixed, ordered 10-question set for today (UTC) — same for every player. */
  questionIds: string[];
  /** 0-based index of the current question within questionIds. */
  position: number;
}

export function GameScreen({
  question,
  dailyContext,
}: {
  question: PublicQuestion;
  dailyContext?: DailyContext;
}) {
  const router = useRouter();
  const { t, locale } = useLocale();
  // Display-only: swaps question/option text for the Italian fields when
  // present, falling back to English (see localizeQuestion.ts). question.id,
  // emojis, category, and everything sent to the API stay untouched.
  const localizedText = localizeQuestion(question, locale);
  const [phase, setPhase] = useState<Phase>("loading");
  const [predicted, setPredicted] = useState(50);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [advancing, setAdvancing] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const hasSeenOnboarding = useSyncExternalStore(
    onboardingStore.subscribe,
    onboardingStore.getSnapshot,
    () => true
  );
  const { profile } = useProfile();
  // Every player gets exactly one mandatory username/avatar setup, ahead of
  // the onboarding explainer — new players and the pre-existing ones who
  // never had a chance to set a username before this feature shipped.
  const needsProfileSetup = profile !== null && !profile.hasCustomUsername;
  const showOnboarding = !needsProfileSetup && !hasSeenOnboarding;
  // Daily plays its own separate, isolated scoring track (see
  // supabase/migration_daily_challenge.sql) — everything else about the
  // predict/vote/reveal loop is identical, just pointed at /api/daily/*.
  const apiBase = dailyContext
    ? `/api/daily/questions/${question.id}`
    : `/api/questions/${question.id}`;

  useEffect(() => {
    track(dailyContext ? "daily_question_started" : "game_started", { questionId: question.id });
    if (!dailyContext) rememberQuestionId(question.id);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBase}/result`);
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
      } catch {
        if (!cancelled) {
          setErrorMessage(t("game_loadError"));
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // router/t excluded: re-fetching on a language toggle or router identity
    // change (rather than only a real question/retry change) would restart
    // the game mid-play. dailyContext/apiBase excluded too: dailyContext is
    // stable for the lifetime of this mount (a new daily question gets a
    // fresh GameScreen via `key`, same as challenge/[id] does), so only the
    // question id / retry attempt should re-trigger this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, loadAttempt]);

  async function handleLockPrediction() {
    setBusy(true);
    setErrorMessage(null);
    track("prediction_started", { questionId: question.id });
    try {
      const res = await fetch(`${apiBase}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictedPercentageA: predicted }),
      });
      if (res.ok) {
        track("prediction_submitted", { questionId: question.id, value: predicted });
        markFirstGameStarted();
        setPhase("vote");
        return;
      }
      const code = await parseErrorCode(res);
      if (code === "ALREADY_PREDICTED") {
        setPhase("vote");
        return;
      }
      setErrorMessage(t("game_predictError"));
    } catch {
      setErrorMessage(t("game_offlineError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleVote(option: VoteOption) {
    setBusy(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${apiBase}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedOption: option }),
      });
      const code = res.ok ? undefined : await parseErrorCode(res);
      if (!res.ok && code !== "ALREADY_VOTED") {
        setErrorMessage(t("game_voteError"));
        return;
      }
      track("vote_submitted", { questionId: question.id, option });

      const resultRes = await fetch(`${apiBase}/result`);
      if (!resultRes.ok) {
        setErrorMessage(t("game_resultError"));
        return;
      }
      const data: PredictionResult = await resultRes.json();
      setResult(data);
      setPhase("result");
      track("result_viewed", { questionId: question.id });
      markQuestionCompleted();
    } catch {
      setErrorMessage(t("game_offlineError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleNext() {
    if (advancing) return;
    setAdvancing(true);
    setErrorMessage(null);
    track("replay_clicked", { questionId: question.id });

    if (dailyContext) {
      const nextIndex = dailyContext.position + 1;
      if (nextIndex >= dailyContext.questionIds.length) {
        track("daily_completed", { date: undefined });
        router.push("/daily");
        return;
      }
      router.push(`/daily/${dailyContext.questionIds[nextIndex]}`);
      return;
    }

    const recent = getRecentQuestionIds();
    const params = new URLSearchParams({ current: question.id, recent: recent.join(",") });

    try {
      const res = await fetch(`/api/questions/next?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to pick next question");
      const data: { id: string } = await res.json();
      router.push(`/challenge/${data.id}`);
    } catch {
      setAdvancing(false);
      setErrorMessage(t("game_nextError"));
    }
  }

  const profileSetup = needsProfileSetup ? <ProfileSetup onDone={() => {}} /> : null;
  const onboarding = showOnboarding ? <Onboarding onDismiss={markOnboardingSeen} /> : null;

  if (phase === "loading") {
    return (
      <>
        {profileSetup}
        {onboarding}
        <LoadingSpinner label={t("game_loadingQuestion")} />
      </>
    );
  }

  if (phase === "error") {
    return (
      <>
        {profileSetup}
        {onboarding}
        <ErrorState
          message={errorMessage ?? undefined}
          onRetry={() => {
            setErrorMessage(null);
            setPhase("loading");
            setLoadAttempt((n) => n + 1);
          }}
        />
      </>
    );
  }

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      {profileSetup}
      {onboarding}
      {dailyContext && (
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          {t("daily_questionProgress", {
            n: dailyContext.position + 1,
            total: dailyContext.questionIds.length,
          })}
        </p>
      )}
      <PhaseSteps current={PHASE_STEP[phase]} />
      <QuestionCard
        dailyNumber={question.dailyNumber}
        category={question.category}
        question={localizedText.text}
      />

      {phase === "predict" && (
        <GameCard key="predict" className="flex animate-fade-in-up flex-col gap-6">
          <PredictionSlider
            value={predicted}
            onChange={setPredicted}
            optionA={localizedText.optionA}
            optionB={localizedText.optionB}
          />
          <Button onClick={handleLockPrediction} loading={busy} className="w-full">
            {busy ? t("game_locking") : t("game_lockPrediction")}
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
              {t("game_nowChoose")}
            </p>
            <p className="mt-1 text-sm text-muted">{t("game_forgetCrowd")}</p>
          </div>
          <div className="flex gap-4">
            <AnswerOption
              label={localizedText.optionA}
              emoji={question.emojiA}
              tone="a"
              disabled={busy}
              onClick={() => handleVote("A")}
            />
            <AnswerOption
              label={localizedText.optionB}
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
            question={{ ...question, text: localizedText.text, optionA: localizedText.optionA, optionB: localizedText.optionB }}
            result={result}
            onNext={handleNext}
            advancing={advancing}
            shareUrl={
              typeof window !== "undefined"
                ? `${window.location.origin}${dailyContext ? "/daily" : `/challenge/${question.id}`}`
                : dailyContext
                  ? "/daily"
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
