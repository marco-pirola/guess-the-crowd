import { NextResponse } from "next/server";
import { toErrorResponse } from "@/lib/apiError";
import { listQuestionIds } from "@/lib/store";
import { pickNextQuestionId } from "@/lib/questionSelection";

/** How many recent ids the client is allowed to send — plenty for session history, cheap to bound. */
const MAX_RECENT = 50;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const currentId = url.searchParams.get("current");
    const recentIds = (url.searchParams.get("recent") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, MAX_RECENT);

    const pool = await listQuestionIds();
    const id = pickNextQuestionId(pool, { currentId, recentIds });
    return NextResponse.json({ id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
