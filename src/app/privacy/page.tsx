import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PrivacyContent } from "@/components/PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Guess the Crowd stores, the cookies it sets, and how analytics is used.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col">
        <PrivacyContent />
      </main>
    </>
  );
}
