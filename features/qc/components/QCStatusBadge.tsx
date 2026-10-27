"use client";

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: "#ea580c", text: "#fff" },
  SUBMITTED: { bg: "#ffedd5", text: "#c2410c" },
  CHECKED: { bg: "#dbeafe", text: "#1d4ed8" },
  APPROVED: { bg: "#dcfce7", text: "#15803d" },
  VERIFIED: { bg: "#dcfce7", text: "#15803d" },
  REJECTED: { bg: "#fee2e2", text: "#b91c1c" },
  CANCELLED: { bg: "#e2e8f0", text: "#64748b" },
  OPEN: { bg: "#ffedd5", text: "#c2410c" },
  CLOSED: { bg: "#dcfce7", text: "#15803d" },
  STORED: { bg: "#dbeafe", text: "#1d4ed8" },
  DUE: { bg: "#ffedd5", text: "#c2410c" },
  DISPOSED: { bg: "#e2e8f0", text: "#64748b" },
};

export function QCStatusBadge({ status }: { status: string }) {
  const tone = STATUS_COLORS[status] ?? { bg: "#f1f5f9", text: "#475569" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: tone.bg,
        color: tone.text,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.3,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

const RESULT_COLORS: Record<string, { bg: string; text: string }> = {
  PASS: { bg: "#dcfce7", text: "#15803d" },
  PASSED: { bg: "#dcfce7", text: "#15803d" },
  WITHIN_SPEC: { bg: "#dcfce7", text: "#15803d" },
  ACCEPTED: { bg: "#dcfce7", text: "#15803d" },
  ACCEPT: { bg: "#dcfce7", text: "#15803d" },
  FAIL: { bg: "#fee2e2", text: "#b91c1c" },
  FAILED: { bg: "#fee2e2", text: "#b91c1c" },
  OUT_OF_SPEC: { bg: "#fee2e2", text: "#b91c1c" },
  REJECTED: { bg: "#fee2e2", text: "#b91c1c" },
  REJECT: { bg: "#fee2e2", text: "#b91c1c" },
  HOLD: { bg: "#ffedd5", text: "#c2410c" },
  PENDING: { bg: "#ffedd5", text: "#c2410c" },
  INCOMPLETE: { bg: "#ffedd5", text: "#c2410c" },
  NOT_EVALUATED: { bg: "#e2e8f0", text: "#64748b" },
  "N/A": { bg: "#e2e8f0", text: "#64748b" },
};

export function QCResultBadge({ result }: { result: string }) {
  const tone = RESULT_COLORS[result] ?? { bg: "#f1f5f9", text: "#475569" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        background: tone.bg,
        color: tone.text,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {result.replace(/_/g, " ")}
    </span>
  );
}
