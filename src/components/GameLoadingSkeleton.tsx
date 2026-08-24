import { Skeleton } from "@/components/Skeleton";
import { GameCard } from "@/components/GameCard";

/** Echoes QuestionCard's shape (category pill, challenge number, title) before the question text is known. */
export function QuestionCardSkeleton() {
  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-3 text-center">
      <div className="flex items-center justify-center gap-2">
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-4 w-24 rounded-full" />
      </div>
      <Skeleton className="h-7 w-full max-w-sm rounded-lg" />
      <Skeleton className="h-7 w-2/3 rounded-lg" />
    </div>
  );
}

/** Echoes the predict-phase GameCard (PredictionSlider) — the phase every question opens on. */
export function PredictCardSkeleton() {
  return (
    <GameCard className="flex w-full flex-col gap-6">
      <Skeleton className="mx-auto h-4 w-40 rounded-full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
      <Skeleton className="h-3 w-full rounded-full" />
      <Skeleton className="h-12 w-full rounded-full" />
    </GameCard>
  );
}
