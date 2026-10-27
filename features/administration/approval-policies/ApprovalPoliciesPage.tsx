"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared";

const field = { padding: 10, border: "1px solid #94a3b8", borderRadius: 9 } as const;

export function ApprovalPoliciesPage({ initialItems }: { initialItems: Array<Record<string, unknown>> }) {
  const [items, setItems] = useState(initialItems);
  const [form, setForm] = useState({ module: "maintenance", resource: "workOrder", requireCheck: true, requireApproval: true, requirePosting: false, makerCannotCheckOwn: true, checkerCannotApproveOwn: true, approverCannotPostOwn: true });
  const save = async () => {
    const response = await fetch("/api/administration/approval-policies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const result = await response.json();
    if (!response.ok) return alert(result.error ?? "Failed to save approval policy");
    setItems((current) => [...current.filter((row) => row.module !== form.module || row.resource !== form.resource), result.item].sort((a, b) => `${a.module}.${a.resource}`.localeCompare(`${b.module}.${b.resource}`)));
  };
  return <div style={{ display: "grid", gap: 20 }}>
    <PageHeader title="Approval Policies" subtitle="Configure maker-checker-approver and posting separation by module and resource." breadcrumbs={[{ label: "Administration" }, { label: "Approval Policies" }]} />
    <section style={{ background: "white", padding: 20, borderRadius: 16, display: "grid", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <input style={field} value={form.module} placeholder="Module" onChange={(e) => setForm({ ...form, module: e.target.value })} />
        <input style={field} value={form.resource} placeholder="Resource" onChange={(e) => setForm({ ...form, resource: e.target.value })} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>{(["requireCheck", "requireApproval", "requirePosting", "makerCannotCheckOwn", "checkerCannotApproveOwn", "approverCannotPostOwn"] as const).map((key) => <label key={key}><input type="checkbox" checked={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /> {key.replace(/([A-Z])/g, " $1")}</label>)}</div>
      <button onClick={save} style={{ ...field, background: "#00897b", color: "white", border: 0, fontWeight: 700, width: 180 }}>Save Policy</button>
    </section>
    <section style={{ background: "white", padding: 20, borderRadius: 16, overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Module", "Resource", "Check", "Approve", "Post", "Maker ≠ Checker", "Checker ≠ Approver", "Approver ≠ Poster"].map((label) => <th key={label} style={{ textAlign: "left", padding: 10 }}>{label}</th>)}</tr></thead><tbody>{items.map((row) => <tr key={`${row.module}.${row.resource}`}>{[row.module, row.resource, row.requireCheck, row.requireApproval, row.requirePosting, row.makerCannotCheckOwn, row.checkerCannotApproveOwn, row.approverCannotPostOwn].map((value, index) => <td key={index} style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{typeof value === "boolean" ? value ? "Yes" : "No" : String(value ?? "-")}</td>)}</tr>)}</tbody></table></section>
  </div>;
}
