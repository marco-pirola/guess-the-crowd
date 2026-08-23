import { seedQuestions } from "@/lib/store/seedQuestions";

const EPOCH = Date.UTC(2026, 0, 1); // Day #1
const DAY_MS = 24 * 60 * 60 * 1000;

/** 1-based daily challenge number, stable across the whole day for every player (UTC). */
export function getDailyNumber(date: Date = new Date()): number {
  const daysSinceEpoch = Math.floor((date.getTime() - EPOCH) / DAY_MS);
  return Math.max(1, daysSinceEpoch + 1);
}

/** The question everyone gets today. Cycles through the seed list. */
export function getDailyQuestionId(date: Date = new Date()): string {
  const dailyNumber = getDailyNumber(date);
  const index = (dailyNumber - 1) % seedQuestions.length;
  return seedQuestions[index].id;
}

export function todayUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
