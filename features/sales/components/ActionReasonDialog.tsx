"use client";

import { useEffect, useState } from "react";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(15, 23, 42, 0.42)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  zIndex: 90,
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 18,
  background: "#ffffff",
  border: "1px solid #e4e7ec",
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.18)",
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const labelStyle: React.CSSProperties = {
  color: "#667085",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  minHeight: 110,
  borderRadius: 14,
  border: "1px solid #94a3b8",
  padding: "12px 14px",
  resize: "vertical",
  fontSize: 15,
  color: "#101828",
  boxSizing: "border-box",
};

const secondaryButtonStyle: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #d0d5dd",
  background: "#ffffff",
  color: "#344054",
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  height: 44,
  padding: "0 16px",
  borderRadius: 12,
  border: "1px solid #fecdca",
  background: "#fef3f2",
  color: "#b42318",
  fontWeight: 700,
  cursor: "pointer",
};

export function ActionReasonDialog({
  open,
  title,
  description,
  confirmLabel,
  loadingLabel,
  initialReason = "",
  isPending = false,
  error = "",
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  loadingLabel: string;
  initialReason?: string;
  isPending?: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState(initialReason);

  useEffect(() => {
    if (open) {
      setReason(initialReason);
    }
  }, [initialReason, open]);

  if (!open) {
    return null;
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={title}>
      <div style={cardStyle}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#101828" }}>{title}</div>
          <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5, color: "#475467" }}>{description}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={labelStyle}>Reason</label>
          <textarea
            style={textareaStyle}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Add a short reason for the audit trail"
          />
        </div>

        {error ? (
          <div style={{ borderRadius: 12, border: "1px solid #fecdca", background: "#fef3f2", color: "#b42318", padding: "10px 12px", fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
          <button type="button" style={secondaryButtonStyle} onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button type="button" style={dangerButtonStyle} onClick={() => onConfirm(reason)} disabled={isPending}>
            {isPending ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
