"use client";

import { useCallback, useState, useTransition } from "react";

export function usePendingAction<T extends string = string>() {
  const [pendingAction, setPendingAction] = useState<T | null>(null);
  const [, startTransition] = useTransition();

  const isLoading = useCallback((action: T) => pendingAction === action, [pendingAction]);
  const isBusy = pendingAction != null;

  const withPending = useCallback((action: T, task: () => Promise<void>) => {
    setPendingAction(action);
    startTransition(async () => {
      try {
        await task();
      } finally {
        setPendingAction(null);
      }
    });
  }, [startTransition]);

  return { pendingAction, isLoading, isBusy, withPending, setPendingAction };
}
