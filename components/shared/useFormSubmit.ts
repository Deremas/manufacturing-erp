"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notifyActionError, notifyActionSuccess } from "./toast";

type SubmitJsonInput = {
  url: string;
  method?: string;
  body: unknown;
  errorFallback: string;
  successHref: string | ((result: Record<string, unknown>) => string);
  onError: (message: string) => void;
  successMessage?: string;
};

export function useFormSubmit() {
  const router = useRouter();
  const savingRef = useRef<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const submitJson = useCallback(async (key: string, input: SubmitJsonInput) => {
    if (savingRef.current) return;
    savingRef.current = key;
    setSavingKey(key);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(input.url, {
        method: input.method ?? "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input.body),
        signal: controller.signal,
      });
      const result = (await response.json().catch(() => ({}))) as Record<string, unknown>;
      if (!response.ok) {
        const message = typeof result.error === "string" ? result.error : input.errorFallback;
        input.onError(message);
        notifyActionError(message);
        return;
      }
      notifyActionSuccess(input.successMessage ?? key);
      const href = typeof input.successHref === "function"
        ? input.successHref(result)
        : input.successHref;
      router.push(href);
    } catch (caught) {
      const timedOut = caught instanceof DOMException && caught.name === "AbortError";
      const message = timedOut
        ? "The request took too long. Please try again."
        : caught instanceof Error ? caught.message : input.errorFallback;
      input.onError(message);
      notifyActionError(message);
    } finally {
      window.clearTimeout(timeoutId);
      savingRef.current = null;
      setSavingKey(null);
    }
  }, [router]);

  return {
    savingKey,
    isBusy: savingKey !== null,
    submitJson,
  };
}
