import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export const metadata: Metadata = {
  title: "Leaderboard",
  description: "See who predicts the crowd best.",
};

export default function LeaderboardPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-10 sm:py-14">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-extrabold sm:text-3xl">Leaderboard</h1>
          <p className="text-sm text-muted">Who reads the crowd best.</p>
        </div>
        <LeaderboardTable />
      </main>
    </>
  );
}
