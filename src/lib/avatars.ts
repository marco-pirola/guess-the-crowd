import type { AvatarKey } from "@/lib/types";

/**
 * Curated, non-uploadable avatar set — visually coherent with the app's
 * existing emoji usage (question emojiA/emojiB, the streak badge). No
 * dedicated Unicode "lynx" emoji exists, so `lynx` is rendered as the
 * closest wild-cat emoji (leopard) until/unless a custom icon replaces it.
 */
export const AVATAR_EMOJI: Record<AvatarKey, string> = {
  fox: "🦊",
  owl: "🦉",
  raven: "🐦‍⬛",
  hawk: "🦅",
  wolf: "🐺",
  tiger: "🐯",
  lynx: "🐆",
};

export const AVATAR_KEYS = Object.keys(AVATAR_EMOJI) as AvatarKey[];

export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === "string" && (AVATAR_KEYS as string[]).includes(value);
}
