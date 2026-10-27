"use client";

import { Play, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { PageHeader, SectionHeading } from "@/components/shared";
import { QCSearchSelect } from "@/features/qc/components/QCSearchSelect";

function executionPath(code: string, id: string) {
  const value = code.toLowerCase();
  const route = value.includes("micro") ? "microbial-test" : value.includes("preform") ? "preform-inspection"
    : value.includes("handle") ? "handle-inspection" : value.includes("cap") ? "cap-inspection" : "water-test";
  return `/qc/${route}/create?taskId=${encodeURIComponent(id)}`;
}

export function QcTaskDetailPage({ task, users }: { task: Record<string, unknown> & { id: string; taskNo: string; testTypeCode: string; testTypeName: string; status: string; priority: string; assignedToId: string | null; dueDate: string | null; parameters: Array<{ id: string; parameterName: string; required: boolean; unitName: string | null }> }; users: Array<{ id: string; name: string; email: string }> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ assignedToId: task.assignedToId ?? "", priority: task.priority, dueDate: task.dueDate?.slice(0, 10) ?? "" });
  const [cancelReason, setCancelReason] = useState("");
  async function action(url: string, body?: object) {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "QC task action failed");
  }
  return <div style={{ display: "grid", gap: 20 }}>
    <PageHeader recordKind="qc.task" title={task.taskNo} subtitle={`${task.testTypeName} task, template-controlled and batch traceable.`} breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Production Output QC", href: "/qc/production-output" }, { label: task.taskNo }]} />
    {message ? <div style={{ background: "white", borderRadius: 14, padding: 14, color: message === "Saved" ? "#047857" : "#b91c1c" }}>{message}</div> : null}
    <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 }}>
      <SectionHeading title="Task Details" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
        {[["Status", task.status], ["Batch", task.batchNo], ["Item", task.itemName], ["Location", task.locationName], ["Machine", task.assetName]].map(([label, value]) => <div key={String(label)}><small style={{ color: "#64748b" }}>{String(label)}</small><div style={{ fontWeight: 700, marginTop: 5 }}>{String(value || "-")}</div></div>)}
      </div>
    </section>
    <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 }}>
      <SectionHeading title="Assignment and deadline" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
        <QCSearchSelect value={form.assignedToId} placeholder="Select ..." options={users.map((user) => ({ value: user.id, label: `${user.name} - ${user.email}` }))} onChange={(value) => setForm({ ...form, assignedToId: value })} />
        <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} style={{ padding: 11, border: "1px solid #94a3b8", borderRadius: 10 }}><option>NORMAL</option><option>HIGH</option><option>URGENT</option><option>LOW</option></select>
        <input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} style={{ padding: 11, border: "1px solid #94a3b8", borderRadius: 10 }} />
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
        <button disabled={pending} onClick={() => startTransition(async () => { try { await action(`/api/qc/tasks/${task.id}/assign`, form); setMessage("Saved"); router.refresh(); } catch (error) { setMessage((error as Error).message); } })} style={{ padding: "11px 16px", border: 0, borderRadius: 10, background: "#00897b", color: "white", fontWeight: 700 }}><Save size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />Save Assignment</button>
        <button disabled={pending} onClick={() => startTransition(async () => { try { await action(`/api/qc/tasks/${task.id}/start`); router.push(executionPath(task.testTypeCode, task.id)); } catch (error) { setMessage((error as Error).message); } })} style={{ padding: "11px 16px", border: "1px solid #0f766e", borderRadius: 10, background: "#f0fdfa", color: "#0f766e", fontWeight: 700 }}><Play size={16} style={{ verticalAlign: "middle", marginRight: 7 }} />Start and Execute</button>
      </div>
      {!['COMPLETED', 'CANCELLED'].includes(task.status) ? <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) auto", gap: 10, marginTop: 14 }}><input value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Cancellation reason" style={{ padding: 11, border: "1px solid #fecaca", borderRadius: 10 }} /><button disabled={pending || !cancelReason.trim()} onClick={() => startTransition(async () => { try { await action(`/api/qc/tasks/${task.id}/cancel`, { reason: cancelReason }); setMessage("Saved"); router.refresh(); } catch (error) { setMessage((error as Error).message); } })} style={{ padding: "11px 16px", border: "1px solid #fecaca", borderRadius: 10, background: "#fff1f2", color: "#be123c", fontWeight: 700 }}>Cancel Task</button></div> : null}
    </section>
    <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 }}><SectionHeading title="Template Parameters" />{task.parameters.map((parameter) => <div key={parameter.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>{parameter.parameterName} {parameter.unitName ? `(${parameter.unitName})` : ""}{parameter.required ? " *" : ""}</div>)}</section>
  </div>;
}
