"use client";

import { useEffect, useRef } from "react";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * Subscribes to a room's lightweight Realtime Broadcast channel and calls
 * `onUpdate` whenever any client (including this one, via the server-side
 * src/lib/rooms/broadcastRoomUpdate.ts) signals the room changed.
 *
 * The broadcast payload itself is never the source of truth — it carries no
 * game data, just "something changed, go re-fetch" — so a missed message is
 * harmless: the caller's own get_room_state/get_room_round_state fetch is
 * what actually reconstructs state, exactly as it must anyway after a plain
 * page refresh.
 */
export function useRoomChannel(roomId: string | null, onUpdate: () => void): void {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!roomId || !isSupabaseConfigured) return;

    const supabase = createBrowserSupabaseClient();
    const channel = supabase.channel(`room:${roomId}`);

    channel.on("broadcast", { event: "room_updated" }, () => onUpdateRef.current()).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
}
