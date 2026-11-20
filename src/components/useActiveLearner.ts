"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import * as profiles from "@/lib/profiles";
import type { Learner } from "@/lib/types";

/**
 * The active child, read from storage after the page has loaded (storage
 * only exists in the browser). `ready` is false until that first read.
 */
export function useActiveLearner() {
  const pathname = usePathname();
  const [learner, setLearner] = useState<Learner | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    setLearner(profiles.active());
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("squigglr:active", refresh);
    return () => window.removeEventListener("squigglr:active", refresh);
  }, [pathname, refresh]);

  return { learner, ready };
}

/** Tells every screen (the header included) that the active child changed. */
export const activeChanged = () => window.dispatchEvent(new Event("squigglr:active"));
