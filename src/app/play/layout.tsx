import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play",
  description: "Jump straight into a new prediction question.",
  alternates: { canonical: "/play" },
  openGraph: { url: "/play" },
};

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
