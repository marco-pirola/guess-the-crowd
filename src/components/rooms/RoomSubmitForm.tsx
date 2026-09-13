"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { localizeQuestion } from "@/lib/i18n/localizeQuestion";
import { PublicQuestion, VoteOption } from "@/lib/types";
import { GameCard } from "@/components/GameCard";
import { QuestionCard } from "@/components/QuestionCard";
import { PredictionSlider } from "@/components/PredictionSlider";
import { AnswerOption } from "@/components/AnswerOption";
import { Button } from "@/components/Button";

/**
 * One combined predict+choose submission (Part rooms decision 2) — unlike
 * single-player's two-phase GameScreen, there's a single "Lock it in"
 * action here, not a separate predict-then-vote gate.
 */
export function RoomSubmitForm({
  question,
  roundNumber,
  onSubmit,
  busy,
  actionErrorMessage,
}: {
  question: PublicQuestion;
  roundNumber: number;
  onSubmit: (predictedPercentageA: number, selectedOption: VoteOption) => void;
  busy: boolean;
  actionErrorMessage: string | null;
}) {
  const { t, locale } = useLocale();
  const localized = localizeQuestion(question, locale);
  const [predicted, setPredicted] = useState(50);
  const [selected, setSelected] = useState<VoteOption | null>(null);

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <QuestionCard dailyNumber={roundNumber} category={question.category} question={localized.text} />

      <GameCard className="flex w-full flex-col gap-6">
        <PredictionSlider
          value={predicted}
          onChange={setPredicted}
          optionA={localized.optionA}
          optionB={localized.optionB}
        />

        <div>
          <p className="mb-3 text-center text-sm text-muted">{t("game_forgetCrowd")}</p>
          <div className="flex gap-4">
            <AnswerOption
              label={localized.optionA}
              emoji={question.emojiA}
              tone="a"
              selected={selected === "A"}
              disabled={busy}
              onClick={() => setSelected("A")}
            />
            <AnswerOption
              label={localized.optionB}
              emoji={question.emojiB}
              tone="b"
              selected={selected === "B"}
              disabled={busy}
              onClick={() => setSelected("B")}
            />
          </div>
        </div>

        <Button
          onClick={() => selected && onSubmit(predicted, selected)}
          disabled={!selected}
          loading={busy}
          className="w-full"
        >
          {t("room_submitCta")}
        </Button>

        {actionErrorMessage && (
          <p role="alert" className="text-center text-sm text-danger">
            {actionErrorMessage}
          </p>
        )}
      </GameCard>
    </div>
  );
}
