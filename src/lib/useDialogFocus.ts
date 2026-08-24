"use client";

import { RefObject, useEffect } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Minimal modal accessibility for the app's `role="dialog"` overlays: moves
 * focus inside the dialog on mount, keeps Tab/Shift+Tab cycling within it so
 * keyboard users can't land on page content hidden behind the backdrop, and
 * restores focus to whatever triggered the dialog on unmount. Escape calls
 * `onClose` when provided — some dialogs (e.g. the mandatory profile setup
 * step) intentionally have no dismiss path, so `onClose` is optional and
 * Escape is a no-op there.
 */
export function useDialogFocus<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  onClose?: () => void
) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const initial = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (initial ?? container).focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = container!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
