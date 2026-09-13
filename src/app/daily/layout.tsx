import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Challenge",
  description: "Today's 10-question Guess the Crowd challenge — the same for every player.",
  alternates: { canonical: "/daily" },
  openGraph: { url: "/daily" },
};

export default function DailyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
