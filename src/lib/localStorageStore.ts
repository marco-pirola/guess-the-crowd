/**
 * Minimal external-store wrapper around a single localStorage key.
 *
 * Consumers read it via `useSyncExternalStore` (during render) instead of
 * `useState` + a mount `useEffect` that calls `setState` — the latter trips
 * `react-hooks/set-state-in-effect` and is exactly the "force update to sync
 * with an external data source" case that hook exists for. It also sidesteps
 * SSR/hydration mismatches: `useSyncExternalStore`'s `getServerSnapshot`
 * argument (passed by each caller) supplies the value to render on the
 * server and during hydration; React reconciles to the real client value —
 * from `getSnapshot` below — right after mount on its own.
 *
 * Same-tab writes (`write`) notify subscribers directly. This does not
 * listen for the cross-tab `storage` event, which this single-tab game
 * doesn't need.
 */
export function createLocalStorageStore<T>(key: string, decode: (raw: string | null) => T) {
  let listeners: Array<() => void> = [];

  function subscribe(listener: () => void) {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }

  function getSnapshot(): T {
    try {
      return decode(window.localStorage.getItem(key));
    } catch {
      return decode(null);
    }
  }

  function write(raw: string): void {
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // localStorage unavailable (private mode, quota, etc.) — preference is best-effort only.
    }
    listeners.forEach((listener) => listener());
  }

  return { subscribe, getSnapshot, write };
}
