"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/localStorageStore";
import { playSoundEffect, primeAudioContext, SoundName } from "@/lib/sound/soundEngine";

const STORAGE_KEY = "gtc:soundEnabled";

/** Default ON — anything other than an explicit stored "0" plays sound. */
function decodeEnabled(raw: string | null): boolean {
  return raw !== "0";
}

const soundStore = createLocalStorageStore(STORAGE_KEY, decodeEnabled);

interface SoundContextValue {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  /** No-ops silently when sound is off or playback is blocked/unavailable — callers never need to check `enabled` themselves. */
  play: (name: SoundName) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(soundStore.subscribe, soundStore.getSnapshot, () => true);

  useEffect(() => {
    // Opportunistically unlock the AudioContext on the very first real user
    // gesture anywhere on the page — not just a sound-specific control. A
    // Rooms sound triggered later by a Realtime update (no gesture of its
    // own, e.g. another player finishing their submission) then has the
    // best chance of not being silently blocked. This only ever runs inside
    // an actual gesture handler, never on its own — not autoplay.
    function unlock() {
      primeAudioContext();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    }
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    soundStore.write(next ? "1" : "0");
  }, []);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      playSoundEffect(name);
    },
    [enabled]
  );

  const value = useMemo(() => ({ enabled, setEnabled, play }), [enabled, setEnabled, play]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within a SoundProvider");
  return ctx;
}
