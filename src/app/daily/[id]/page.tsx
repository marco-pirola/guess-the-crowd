import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { GameScreen } from "@/components/GameScreen";
import { GameFlowError, getOrCreateDailyChallenge, getPublicQuestionById } from "@/lib/store";
import { todayUtcDateString } from "@/lib/dailyChallenge";

export const metadata: Metadata = {
  title: "Daily Challenge",
  description: "Today's 10-question Guess the Crowd challenge — the same for every player.",
};

export default async function DailyQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const questionIds = await getOrCreateDailyChallenge(todayUtcDateString());
  const position = questionIds.indexOf(id);

  // Not one of today's 10 (stale bookmark, or the date rolled over) — send
  // back to /daily, which resolves the current date's set fresh.
  if (position === -1) {
    redirect("/daily");
  }

  let question;
  try {
    question = await getPublicQuestionById(id);
  } catch (error) {
    if (error instanceof GameFlowError && error.code === "QUESTION_NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:py-12">
        <GameScreen key={question.id} question={question} dailyContext={{ questionIds, position }} />
      </main>
    </>
  );
}
