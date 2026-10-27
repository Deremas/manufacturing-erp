"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  dismissToast,
  subscribeToasts,
  TOAST_DURATION_MS,
  type ToastItem,
  type ToastTone,
} from "./toast";

const toneDecor: Record<
  ToastTone,
  { icon: React.ReactNode; label: string }
> = {
  success: { icon: <CheckCircle2 size={22} />, label: "Success" },
  error: { icon: <XCircle size={22} />, label: "Error" },
  warning: { icon: <AlertTriangle size={22} />, label: "Warning" },
  info: { icon: <Info size={22} />, label: "Info" },
};

export default function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (items.length === 0) return null;

  return (
    <div className="erp-toast-host" aria-live="polite" aria-relevant="additions">
      {items.map((toast) => {
        const decor = toneDecor[toast.tone];
        return (
          <div
            key={toast.id}
            className={`erp-toast erp-toast-${toast.tone}`}
            role="status"
          >
            <div className="erp-toast-glow" aria-hidden />
            <div className="erp-toast-icon">{decor.icon}</div>
            <div className="erp-toast-copy">
              <div className="erp-toast-kicker">{decor.label}</div>
              <div className="erp-toast-title">{toast.title}</div>
              {toast.message ? (
                <div className="erp-toast-message">{toast.message}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="erp-toast-close"
              aria-label="Dismiss notification"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={16} />
            </button>
            <span
              className="erp-toast-progress"
              style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
            />
          </div>
        );
      })}
    </div>
  );
}
