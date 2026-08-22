import { ReactNode } from "react";
import { ProgressIndicator } from "@/components/ProgressIndicator";

export function QuestionCard({
  dailyNumber,
  category,
  question,
  children,
}: {
  dailyNumber: number;
  category: string;
  question: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-lg flex-col gap-6 rounded-3xl border border-border bg-surface p-6 shadow-sm sm:p-8">
      <ProgressIndicator dailyNumber={dailyNumber} category={category} />
      <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{question}</h1>
      {children}
    </div>
  );
}
