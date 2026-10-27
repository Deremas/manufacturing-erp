"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SectionHeading } from "@/components/shared";
export function HoldDispositionPanel({ holdId, remainingQty, locations }: { holdId: string; remainingQty: number; locations: Array<{ id: string; code: string; name: string }> }) {
  const router = useRouter(); const [pending, start] = useTransition(); const [message, setMessage] = useState("");
  const [form, setForm] = useState({ dispositionType: "RELEASE", quantity: String(remainingQty), destinationLocationId: "", reason: "" });
  return <section className="no-print" style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 }}><SectionHeading title="Post Partial or Full Disposition" />{message && <p style={{ color: "#b91c1c" }}>{message}</p>}<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12 }}>
    <select value={form.dispositionType} onChange={(e) => setForm({ ...form, dispositionType: e.target.value })}><option value="RELEASE">Release as usable stock</option><option value="REWORK">Rework / reuse in production</option><option value="DOWNGRADE">Downgrade product</option><option value="RETURN">Return to source</option><option value="REJECT">Move to rejected stock</option><option value="SCRAP">Scrap and remove from stock</option></select>
    <input type="number" min="0.0001" max={remainingQty} step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
    <select value={form.destinationLocationId} onChange={(e) => setForm({ ...form, destinationLocationId: e.target.value })}><option value="">Destination (not needed for scrap)</option>{locations.map((row) => <option key={row.id} value={row.id}>{row.code} - {row.name}</option>)}</select>
    <input placeholder="Required disposition reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
  </div><button disabled={pending || remainingQty <= 0} onClick={() => start(async () => { const response = await fetch(`/api/qc/hold-release/${holdId}/disposition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantity: Number(form.quantity) }) }); const result = await response.json(); if (!response.ok) return setMessage(result.error ?? "Disposition failed"); setMessage(""); router.refresh(); })} style={{ marginTop: 14, border: 0, borderRadius: 10, padding: "11px 16px", background: "#00897b", color: "white", fontWeight: 700 }}>Post Disposition</button></section>;
}
