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
      <main className="flex flex-1 flex-col items-center gap-6 px-4 py-10">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <LeaderboardTable />
      </main>
    </>
  );
}
