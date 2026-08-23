"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ProfileSummary } from "@/lib/types";

interface ProfileContextValue {
  profile: ProfileSummary | null;
  loading: boolean;
  /** Re-fetches from the server (e.g. after a Save-progress link succeeds). */
  refresh: () => Promise<void>;
  /** PATCHes /api/me and updates local state on success; throws the server's error message on failure. */
  patch: (body: { username?: string; avatarKey?: string }) => Promise<ProfileSummary>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

async function fetchProfile(): Promise<ProfileSummary> {
  const res = await fetch("/api/me");
  if (!res.ok) throw new Error("Failed to load profile");
  return res.json();
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setProfile(await fetchProfile());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Not routed through `refresh` (which sets loading synchronously at its
    // top) — react-hooks/set-state-in-effect flags calling a function that
    // sets state synchronously from an effect body. Setting state only from
    // inside the promise callbacks below keeps this to the accepted
    // "subscribe to an external system, setState in its callback" shape.
    let cancelled = false;
    fetchProfile()
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = useCallback(async (body: { username?: string; avatarKey?: string }) => {
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.code ?? data?.error ?? "UPDATE_FAILED");
    }
    setProfile(data);
    return data as ProfileSummary;
  }, []);

  return (
    <ProfileContext.Provider value={{ profile, loading, refresh, patch }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within a ProfileProvider");
  return ctx;
}
