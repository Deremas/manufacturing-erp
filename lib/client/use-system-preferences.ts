"use client";

import { useEffect, useState } from "react";

export interface ClientSystemPreferences {
  currencyCode: string;
  currencyLabel: string;
  dateFormat: string;
}

const DEFAULT_PREFERENCES: ClientSystemPreferences = {
  currencyCode: "ETB",
  currencyLabel: "Ethiopian Birr",
  dateFormat: "DD/MM/YYYY",
};

export function useSystemPreferences() {
  const [preferences, setPreferences] = useState<ClientSystemPreferences>(
    DEFAULT_PREFERENCES,
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/system/preferences", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as Partial<ClientSystemPreferences>;

        if (!cancelled) {
          setPreferences({
            currencyCode: data.currencyCode || DEFAULT_PREFERENCES.currencyCode,
            currencyLabel:
              data.currencyLabel || DEFAULT_PREFERENCES.currencyLabel,
            dateFormat: data.dateFormat || DEFAULT_PREFERENCES.dateFormat,
          });
        }
      } catch {
        // Keep safe defaults if preferences cannot be loaded.
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  return preferences;
}
