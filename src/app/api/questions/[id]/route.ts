import { NextResponse } from "next/server";
import { assertValidQuestionId } from "@/lib/validation";
import { toErrorResponse } from "@/lib/apiError";
import { getPublicQuestionById } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const questionId = assertValidQuestionId(id);
    const question = await getPublicQuestionById(questionId);
    return NextResponse.json(question);
  } catch (error) {
    return toErrorResponse(error);
  }
}
