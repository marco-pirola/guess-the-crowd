export class ValidationError extends Error {}

/** Whole-number percentage in [0, 100]. Rejects NaN, floats, out-of-range, and non-numbers. */
export function assertValidPercentage(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError("Percentage must be a number.");
  }
  if (!Number.isInteger(value)) {
    throw new ValidationError("Percentage must be a whole number.");
  }
  if (value < 0 || value > 100) {
    throw new ValidationError("Percentage must be between 0 and 100.");
  }
  return value;
}

export function assertValidVoteOption(value: unknown): "A" | "B" {
  if (value !== "A" && value !== "B") {
    throw new ValidationError('Vote option must be "A" or "B".');
  }
  return value;
}

export function assertValidPlayerId(value: unknown): string {
  if (typeof value !== "string" || value.length < 8) {
    throw new ValidationError("Missing or invalid player id.");
  }
  return value;
}

export function assertValidQuestionId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError("Missing or invalid question id.");
  }
  return value;
}
