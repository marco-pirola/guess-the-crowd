import Link from "next/link";
import { Header } from "@/components/Header";

const STEPS = [
  {
    title: "Predict",
    body: "Read the question and guess what percentage of the crowd will pick each answer.",
  },
  {
    title: "Choose",
    body: "Lock your prediction, then — only then — answer the question yourself.",
  },
  {
    title: "Reveal",
    body: "See how the crowd actually answered, and how close your read was.",
  },
];

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center sm:py-24">
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            A daily prediction game
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
            Guess the Crowd
          </h1>
          <p className="max-w-sm text-lg text-muted">
            Not what&apos;s right — what everyone else will pick.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/play"
            className="rounded-full bg-accent px-8 py-3 text-base font-semibold text-accent-foreground transition-all hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
          >
            Play today
          </Link>
          <a
            href="#how-it-works"
            className="rounded-full border border-border px-8 py-3 text-base font-semibold text-foreground transition-colors hover:bg-surface-sunken"
          >
            How it works
          </a>
        </div>
      </main>

      <section
        id="how-it-works"
        className="flex flex-col items-center gap-8 border-t border-border px-4 py-16 sm:py-20"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          How it works
        </h2>
        <div className="grid w-full max-w-3xl gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6"
            >
              <span className="text-xs font-semibold text-accent">0{i + 1}</span>
              <h3 className="text-lg font-bold">{step.title}</h3>
              <p className="text-sm text-muted">{step.body}</p>
            </div>
          ))}
        </div>
        <p className="max-w-sm text-sm text-muted">
          There&apos;s no correct answer. You&apos;re scored on predicting everyone else.
        </p>
      </section>
    </>
  );
}
