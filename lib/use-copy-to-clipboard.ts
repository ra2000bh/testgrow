"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Tracks which copy action succeeded so buttons can show “Copied” briefly (best-practice feedback).
 */
export function useCopyToClipboard(resetMs = 2200) {
  const [lastCopiedId, setLastCopiedId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (id: string, text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setLastCopiedId(id);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setLastCopiedId(null), resetMs);
        return true;
      } catch {
        return false;
      }
    },
    [resetMs],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { lastCopiedId, copy };
}
