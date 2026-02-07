"use client";

import { useCallback, useRef } from "react";

const DEFAULT_MS = 600;

export function useDebouncedSave(
  save: (data: Record<string, unknown>) => Promise<void>,
  ms: number = DEFAULT_MS
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (pendingRef.current) {
      const data = pendingRef.current;
      pendingRef.current = null;
      save(data).catch(() => {});
    }
  }, [save]);

  const scheduleSave = useCallback(
    (data: Record<string, unknown>) => {
      pendingRef.current = data;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(flush, ms);
    },
    [ms, flush]
  );

  return { scheduleSave, flush };
}
