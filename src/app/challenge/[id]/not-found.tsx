import Link from "next/link";
import { Header } from "@/components/Header";

export default function ChallengeNotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
        <p className="text-lg font-medium">This challenge doesn&apos;t exist.</p>
        <Link
          href="/play"
          className="inline-flex items-center justify-center rounded-full bg-accent px-6 py-3 text-base font-semibold text-accent-foreground transition-all hover:scale-[1.02] hover:brightness-110 active:scale-[0.98]"
        >
          Play today&apos;s challenge
        </Link>
      </main>
    </>
  );
}
