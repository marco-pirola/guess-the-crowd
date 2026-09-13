"use client";

import { useEffect } from "react";
import { markReturnVisit } from "@/lib/analyticsProgress";

/**
 * Mounted once at the root (see layout.tsx). Its only job is the one-time
 * return-visit check — arrival/pageview counts come from Vercel Web
 * Analytics' own automatic pageview tracking (see <Analytics /> in
 * layout.tsx), so there's no separate page_view event to fire here.
 */
export function AnalyticsBoot() {
  useEffect(() => {
    markReturnVisit();
  }, []);

  return null;
}
