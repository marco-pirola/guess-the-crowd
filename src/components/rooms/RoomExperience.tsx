"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/lib/i18n/LocaleContext";
import { PublicQuestion, VoteOption } from "@/lib/types";
import { RoomLeaderboardEntry, RoomRoundState } from "@/lib/rooms/types";
import {
  RoomApiError,
  RoomStateResponse,
  apiFetchRoomLeaderboard,
  apiFetchRoomRoundState,
  apiFetchRoomState,
  apiLeaveRoom,
  apiNextRound,
  apiRevealRound,
  apiStartRoom,
  apiSubmitRound,
} from "@/lib/rooms/roomClient";
import { roomErrorTranslationKey } from "@/lib/rooms/roomErrorKey";
import { useRoomChannel } from "@/lib/rooms/useRoomChannel";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ErrorState } from "@/components/ErrorState";
import { RoomLobby } from "@/components/rooms/RoomLobby";
import { RoomSubmitForm } from "@/components/rooms/RoomSubmitForm";
import { RoomWaitingPanel } from "@/components/rooms/RoomWaitingPanel";
import { RoomRevealResults } from "@/components/rooms/RoomRevealResults";
import { RoomFinalLeaderboard } from "@/components/rooms/RoomFinalLeaderboard";
import { JoinRoomForm } from "@/components/rooms/JoinRoomForm";
import { RoomHostLeftState } from "@/components/rooms/RoomHostLeftState";

interface RoomSnapshot {
  state: RoomStateResponse;
  /** undefined = this call's round-state fetch didn't run or failed — leave existing state alone, don't erase it. */
  roundState: RoomRoundState | null | undefined;
  question: PublicQuestion | null;
  questionChanged: boolean;
  leaderboard: RoomLeaderboardEntry[] | null;
}

/**
 * Pure data-fetching — no setState here, only a mutable ref (never React
 * state) to track the last-seen question id. Kept separate from any setState
 * call so both the mount effect and the reusable `refresh` callback below can
 * call it and apply the result in their own callback, which is what keeps
 * this out of the "setState synchronously in an effect body" anti-pattern
 * (see src/lib/profile/ProfileContext.tsx for the same shape/reasoning).
 */
async function loadRoomSnapshot(
  code: string,
  lastQuestionIdRef: MutableRefObject<string | null>
): Promise<RoomSnapshot> {
  const state = await apiFetchRoomState(code);

  // undefined by default: a failed fetch here must leave the caller's
  // existing round state untouched (never erase a valid waiting/revealed
  // view over a transient network hiccup) — only a successful fetch, or the
  // deliberate "back to lobby" case, produces a value to apply.
  let roundState: RoomRoundState | null | undefined = state.status === "lobby" ? null : undefined;
  if (state.status !== "lobby") {
    try {
      roundState = await apiFetchRoomRoundState(code);
    } catch (err) {
      console.error("[rooms] round state refresh failed", err);
    }
  }

  // lastQuestionIdRef is only advanced to the new id once the fetch for it
  // actually succeeds — if it fails, the ref still points at the previous
  // (stale) id, so the very next refresh (background poll or Realtime
  // signal) sees currentQuestionId !== lastQuestionIdRef.current again and
  // retries automatically, instead of being permanently marked "handled"
  // after a transient failure.
  let question: PublicQuestion | null = null;
  let questionChanged = false;
  if (state.currentQuestionId && state.currentQuestionId !== lastQuestionIdRef.current) {
    try {
      const res = await fetch(`/api/questions/${state.currentQuestionId}`);
      if (res.ok) {
        question = await res.json();
        lastQuestionIdRef.current = state.currentQuestionId;
        questionChanged = true;
      } else {
        console.error("[rooms] question fetch failed", res.status);
      }
    } catch (err) {
      console.error("[rooms] question fetch failed", err);
    }
  } else if (!state.currentQuestionId && lastQuestionIdRef.current !== null) {
    lastQuestionIdRef.current = null;
    questionChanged = true;
  }

  // Fetched a round earlier than before (also during 'revealed', not just
  // 'finished') so the reveal screen can show each player's cumulative
  // room total alongside this round's score — get_room_leaderboard is
  // already usable at any room status (see supabase/migration_rooms.sql),
  // so this needed no backend change, just fetching it one state earlier.
  let leaderboard: RoomLeaderboardEntry[] | null = null;
  if (state.status === "revealed" || state.status === "finished") {
    try {
      leaderboard = await apiFetchRoomLeaderboard(code);
    } catch (err) {
      console.error("[rooms] leaderboard refresh failed", err);
    }
  }

  return { state, roundState, question, questionChanged, leaderboard };
}

/**
 * Server state (via get_room_state / get_room_round_state) is the only
 * source of truth here — this component never invents a client-side phase
 * of its own. Every action (start/submit/reveal/next) calls the existing
 * API route, then re-fetches authoritative state; Realtime Broadcast events
 * from src/lib/rooms/useRoomChannel.ts are purely "go re-fetch" signals,
 * never carrying game data themselves.
 */
export function RoomExperience({ code }: { code: string }) {
  const { t } = useLocale();
  const router = useRouter();

  const [room, setRoom] = useState<RoomStateResponse | null>(null);
  const [roundState, setRoundState] = useState<RoomRoundState | null>(null);
  const [question, setQuestion] = useState<PublicQuestion | null>(null);
  const [leaderboard, setLeaderboard] = useState<RoomLeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalErrorCode, setFatalErrorCode] = useState<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [actionErrorCode, setActionErrorCode] = useState<string | undefined>(undefined);

  const lastQuestionIdRef = useRef<string | null>(null);

  function applySnapshot(snapshot: RoomSnapshot) {
    setRoom(snapshot.state);
    setFatalErrorCode(undefined);
    if (snapshot.roundState !== undefined) setRoundState(snapshot.roundState);
    if (snapshot.questionChanged) setQuestion(snapshot.question);
    if (snapshot.state.status === "revealed" || snapshot.state.status === "finished") {
      setLeaderboard(snapshot.leaderboard);
    }
  }

  // Initial load on mount — inlined (not routed through `refresh`, which
  // itself calls setState) so the effect body only ever calls setState from
  // inside this promise chain's own callbacks, not synchronously as part of
  // invoking a function known to set state. Same shape as
  // src/lib/profile/ProfileContext.tsx's mount effect.
  useEffect(() => {
    let cancelled = false;
    loadRoomSnapshot(code, lastQuestionIdRef)
      .then((snapshot) => {
        if (!cancelled) applySnapshot(snapshot);
      })
      .catch((err) => {
        if (!cancelled) setFatalErrorCode(err instanceof RoomApiError ? err.code : undefined);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await loadRoomSnapshot(code, lastQuestionIdRef);
      applySnapshot(snapshot);
    } catch (err) {
      setFatalErrorCode(err instanceof RoomApiError ? err.code : undefined);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useRoomChannel(room?.id ?? null, refresh);

  async function runAction(action: () => Promise<void>) {
    setBusy(true);
    setActionErrorCode(undefined);
    try {
      await action();
      await refresh();
    } catch (err) {
      setActionErrorCode(err instanceof RoomApiError ? err.code : undefined);
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    await apiLeaveRoom(code).catch(() => undefined);
    router.push("/rooms");
  }

  if (loading && !room) {
    return <LoadingSpinner label={t("room_loading")} />;
  }

  if (fatalErrorCode === "NOT_ROOM_MEMBER") {
    // Invite-link flow: the code is already known from the URL, so this
    // never asks for it again — just a nickname, then join_room (the same
    // API /rooms/join uses) establishes membership server-side before the
    // next refresh() picks up the now-member state and the lobby renders.
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
        <JoinRoomForm presetCode={code} onJoined={() => refresh()} />
      </div>
    );
  }

  if (fatalErrorCode || !room) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
        <ErrorState message={t(roomErrorTranslationKey(fatalErrorCode))} onRetry={refresh} />
      </div>
    );
  }

  const isHost = room.hostId === room.playerId;
  const actionErrorMessage = actionErrorCode ? t(roomErrorTranslationKey(actionErrorCode)) : null;
  const isLastRound = room.currentRound >= room.roundCount;

  // The host's own row drops out of get_room_state's players array the
  // moment they leave (left_at set), so "no player has isHost: true" is
  // already derivable from the existing response — no backend change
  // needed. 'finished' is excluded: that's its own legitimate terminal
  // state (final leaderboard), not one this should override.
  const hostLeft = room.status !== "finished" && !room.players.some((p) => p.isHost);

  if (hostLeft) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8 sm:py-12">
        <RoomHostLeftState />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-4 py-8 sm:py-12">
      {room.status === "lobby" && (
        <RoomLobby
          room={room}
          myPlayerId={room.playerId}
          isHost={isHost}
          onStart={() => runAction(() => apiStartRoom(code))}
          busy={busy}
          actionErrorMessage={actionErrorMessage}
        />
      )}

      {room.status === "in_round" &&
        (!room.mySubmitted ? (
          question ? (
            <RoomSubmitForm
              question={question}
              roundNumber={room.currentRound}
              onSubmit={(predicted, selected) =>
                runAction(() => apiSubmitRound(code, predicted, selected as VoteOption))
              }
              busy={busy}
              actionErrorMessage={actionErrorMessage}
            />
          ) : (
            <LoadingSpinner label={t("room_loading")} />
          )
        ) : roundState && roundState.status === "in_round" ? (
          <RoomWaitingPanel
            roundState={roundState}
            isHost={isHost}
            onReveal={() => runAction(() => apiRevealRound(code))}
            busy={busy}
            actionErrorMessage={actionErrorMessage}
          />
        ) : (
          <LoadingSpinner label={t("room_loading")} />
        ))}

      {room.status === "revealed" &&
        (question && roundState && roundState.status !== "in_round" ? (
          <RoomRevealResults
            question={question}
            roundState={roundState}
            leaderboard={leaderboard}
            myPlayerId={room.playerId}
            isHost={isHost}
            isLastRound={isLastRound}
            onNext={() => runAction(() => apiNextRound(code))}
            busy={busy}
            actionErrorMessage={actionErrorMessage}
          />
        ) : (
          <LoadingSpinner label={t("room_loading")} />
        ))}

      {room.status === "finished" &&
        (leaderboard ? (
          <RoomFinalLeaderboard entries={leaderboard} />
        ) : (
          <LoadingSpinner label={t("room_loading")} />
        ))}

      <button
        type="button"
        onClick={handleLeave}
        className="text-xs font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
      >
        {t("room_leave")}
      </button>
    </div>
  );
}
