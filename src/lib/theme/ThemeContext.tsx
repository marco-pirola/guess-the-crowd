"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/localStorageStore";

export type Theme = "light" | "dark";
const STORAGE_KEY = "gtc:theme";

/** No stored override yet: falls back to the live system preference, same as globals.css's `@media` block. */
function decodeTheme(raw: string | null): Theme {
  if (raw === "light" || raw === "dark") return raw;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const themeStore = createLocalStorageStore(STORAGE_KEY, decodeTheme);

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * The blocking inline script in layout.tsx (not React) is what prevents a
 * flash of the wrong theme on load, by setting `data-theme` before first
 * paint. This provider's job is just keeping React's `theme` value (driving
 * ThemeToggle's icon) and the DOM attribute in sync afterward — no stored
 * theme is default-forced here, so "dark" only wins if either the player
 * chose it or their system preference is dark (see AGENTS.md P1 note).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, () => "dark" as Theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    themeStore.write(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

/**
 * Runs before hydration via a blocking inline <script> in layout.tsx, so the
 * correct theme is on the DOM for the very first paint (no flash). Only ever
 * reads/writes a fixed localStorage key and sets a fixed attribute — never
 * interpolates external input into the script text.
 */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = window.localStorage.getItem("${STORAGE_KEY}");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;
