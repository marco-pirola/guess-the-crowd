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
          className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-accent-foreground"
        >
          Play today&apos;s challenge
        </Link>
      </main>
    </>
  );
}
