import { Skeleton } from "@/components/Skeleton";

/** Echoes a leaderboard row's rank + name + score layout. Shared by LeaderboardTable and DailyLeaderboard. */
export function LeaderboardRowsSkeleton({ count }: { count: number }) {
  return (
    <ol aria-hidden className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <Skeleton className="h-4 w-8 rounded" />
        </li>
      ))}
    </ol>
  );
}
