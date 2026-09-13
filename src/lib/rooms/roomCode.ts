/**
 * Client/API-layer format checking + normalization only — the code itself
 * is always generated server-side (see generate_room_code in
 * supabase/migration_rooms.sql). Excludes visually confusable characters
 * (0/O, 1/I/L).
 */
const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 5;

const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${ROOM_CODE_LENGTH}}$`);

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidRoomCodeFormat(code: string): boolean {
  return ROOM_CODE_PATTERN.test(code);
}
