import { NextResponse } from "next/server";
import { assertValidQuestionId } from "@/lib/validation";
import { toErrorResponse } from "@/lib/apiError";
import { GameFlowError, toPublicQuestion } from "@/lib/store";
import { seedQuestions } from "@/lib/store/seedQuestions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = assertValidQuestionId(id);
    const question = seedQuestions.find((q) => q.id === questionId);
    if (!question) {
      throw new GameFlowError(`Unknown question: ${questionId}`, "QUESTION_NOT_FOUND");
    }
    return NextResponse.json(toPublicQuestion(question));
  } catch (error) {
    return toErrorResponse(error);
  }
}
