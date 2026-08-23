import { ReactNode } from "react";

/** The single grounded surface that holds whatever the current phase needs. */
export function GameCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`w-full rounded-3xl border border-border bg-surface p-6 sm:p-8 ${className}`}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}
