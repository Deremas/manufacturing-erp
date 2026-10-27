"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { colors } from "@/components/ui/colors";

export type ReconciliationCheck = {
  label: string;
  result: "Passed" | "Warning" | "Blocking" | "Not Applicable";
  detail: string;
};

export default function ShiftReconciliationPage({
  sessionId,
  publicId,
  sessionNo,
  status,
  checks,
}: {
  sessionId: string;
  publicId: number;
  sessionNo: string;
  status: string;
  checks: ReconciliationCheck[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const blocking = checks.filter((check) => check.result === "Blocking");
  const canClose = status === "ACTIVE" && blocking.length === 0;

  async function closeShift() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/shifts/sessions/${sessionId}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to close the shift");
      router.push(`/production/shift-sessions/${publicId}`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to close the shift");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Shift Reconciliation</h1>
          <p style={{ margin: "6px 0 0", color: colors.text.secondary, fontSize: 14 }}>{sessionNo}. Blocking conditions must be cleared before closure. Ending the shift does not post finished goods.</p>
        </div>
        <Link href={`/production/shift-sessions/${publicId}`} style={secondary}>Back to Shift</Link>
      </header>
      <section style={card}>
        {checks.map((check) => (
          <div key={check.label} style={{ display: "grid", gridTemplateColumns: "220px 140px 1fr", gap: 12, padding: "12px 0", borderTop: `1px solid ${colors.border}` }}>
            <strong>{check.label}</strong>
            <span style={{ color: check.result === "Blocking" ? "#b91c1c" : check.result === "Warning" ? "#b45309" : colors.text.secondary }}>{check.result}</span>
            <span style={{ color: colors.text.secondary }}>{check.detail}</span>
          </div>
        ))}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
          <button type="button" disabled={!canClose || pending} onClick={closeShift} style={{ ...primary, opacity: canClose ? 1 : 0.5, cursor: canClose ? "pointer" : "not-allowed" }}>
            {status === "ACTIVE" ? (pending ? "Closing..." : "Close Shift") : "Shift is not active"}
          </button>
        </div>
      </section>
    </div>
  );
}

const card: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 };
const secondary: React.CSSProperties = { height: 42, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: 8, border: `1px solid ${colors.border}`, textDecoration: "none", color: colors.text.primary, fontWeight: 600 };
const primary: React.CSSProperties = { height: 42, padding: "0 16px", border: 0, borderRadius: 8, background: colors.primary[600], color: "white", fontWeight: 600 };
