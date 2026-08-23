import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { GameScreen } from "@/components/GameScreen";
import { GameFlowError, getPublicQuestionById } from "@/lib/store";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const question = await getPublicQuestionById(id);
    const title = "Can you predict the crowd?";
    const description = `I'm playing Guess the Crowd: "${question.text}" — think you can predict what everyone else picks?`;
    return {
      title,
      description,
      openGraph: { title, description },
      twitter: { title, description },
    };
  } catch {
    return { title: "Challenge not found" };
  }
}

export default async function ChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
        {/*
         * `key` forces a full remount (fresh phase/predicted/result/etc.
         * state) whenever the question id changes. Without it, navigating
         * A -> B via handleNext's router.push would briefly render B's
         * question text against A's leftover phase/result state, since
         * React only re-runs GameScreen's effects on a prop change — it
         * doesn't reset state on its own.
         */}
        <GameScreen key={question.id} question={question} />
      </main>
    </>
  );
}
