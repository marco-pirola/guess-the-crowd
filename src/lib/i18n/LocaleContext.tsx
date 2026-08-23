"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";
import { createLocalStorageStore } from "@/lib/localStorageStore";
import { dictionaries, Locale, TranslationKey } from "@/lib/i18n/translations";

const STORAGE_KEY = "gtc:locale";

function decodeLocale(raw: string | null): Locale | null {
  return raw === "en" || raw === "it" ? raw : null;
}

const localeStore = createLocalStorageStore(STORAGE_KEY, decodeLocale);

/** en/it interpolation only ever swaps `{token}` for plain strings/numbers — never runs untrusted input as markup. */
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Server-rendered markup always starts as "en" (no cookie/header-based
 * locale detection in this pass — see AGENTS.md P1 note). Once mounted,
 * useSyncExternalStore re-syncs to the stored preference on its own, so
 * returning Italian players see a brief flash of English before it kicks in.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore(localeStore.subscribe, localeStore.getSnapshot, () => null);
  const locale: Locale = stored ?? "en";

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    localeStore.write(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string | number>) =>
      interpolate(dictionaries[locale][key], vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within a LocaleProvider");
  return ctx;
}
