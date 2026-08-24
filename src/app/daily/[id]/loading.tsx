import { Header } from "@/components/Header";
import { PhaseSteps } from "@/components/PhaseSteps";
import { Skeleton } from "@/components/Skeleton";
import { QuestionCardSkeleton, PredictCardSkeleton } from "@/components/GameLoadingSkeleton";

/**
 * Route-level Suspense fallback while the server component resolves today's
 * Daily question. Mirrors challenge/[id]/loading.tsx's shape, plus the
 * question-progress badge GameScreen shows for Daily specifically.
 */
export default function Loading() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:py-12">
        <div className="flex w-full max-w-lg flex-col items-center gap-6">
          <Skeleton className="h-4 w-28 rounded-full" />
          <PhaseSteps current={0} />
          <QuestionCardSkeleton />
          <PredictCardSkeleton />
        </div>
      </main>
    </>
  );
}
