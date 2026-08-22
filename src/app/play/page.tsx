import { redirect } from "next/navigation";
import { getDailyQuestionId } from "@/lib/dailyChallenge";

export default function PlayPage() {
  redirect(`/challenge/${getDailyQuestionId()}`);
}
