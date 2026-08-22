"use client";

import { Header } from "@/components/Header";
import { ErrorState } from "@/components/ErrorState";

export default function ChallengeError({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8">
        <ErrorState message="Couldn't load this challenge." onRetry={reset} />
      </main>
    </>
  );
}
