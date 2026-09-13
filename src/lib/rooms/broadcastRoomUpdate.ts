import { createServerSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Fire-and-forget notification on a room's Realtime Broadcast channel:
 * "this room changed, go re-fetch" — never game data itself (see
 * src/lib/rooms/useRoomChannel.ts). Sent server-side, right after a
 * mutation's RPC call succeeds, so delivery doesn't depend on the acting
 * client's own tab staying connected.
 *
 * Postgres is already the source of truth by the time this runs — a lost or
 * delayed broadcast is never a correctness problem, only a staleness one
 * (the next successful broadcast, or a manual refresh, converges to the
 * same server state via get_room_state/get_room_round_state). Failure here
 * must never fail the request that triggered it.
 */
export async function broadcastRoomUpdate(roomId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.channel(`room:${roomId}`).send({
      type: "broadcast",
      event: "room_updated",
      payload: {},
    });
  } catch (error) {
    console.error("[rooms] broadcast failed", error);
  }
}
