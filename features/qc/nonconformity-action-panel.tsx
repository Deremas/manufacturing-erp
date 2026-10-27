"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SectionHeading } from "@/components/shared";

type UserOption = { id: string; name: string; email: string };
type NcRecord = Record<string, unknown>;

const field = { minHeight: 44, border: "1px solid #94a3b8", borderRadius: 10, padding: "9px 11px", width: "100%", background: "white" } as const;

export function NonconformityActionPanel({ record, users }: { record: NcRecord; users: UserOption[] }) {
  const router = useRouter();
  const [responsiblePersonId, setResponsiblePersonId] = useState(String(record.responsiblePersonId ?? ""));
  const [rootCause, setRootCause] = useState(String(record.rootCause ?? ""));
  const [correctiveAction, setCorrectiveAction] = useState(String(record.correctiveAction ?? ""));
  const [dueDate, setDueDate] = useState(record.dueDate ? String(record.dueDate).slice(0, 10) : "");
  const [disposition, setDisposition] = useState(String(record.disposition ?? ""));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const closed = String(record.status) === "CLOSED";
  const reinspectionResult = String(record.reinspectionResult ?? "PENDING");
  const reinspectionTaskId = String(record.reinspectionTaskId ?? "");

  function send(close = false) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/qc/nonconformities/${String(record.id)}${close ? "/close" : ""}`, {
        method: close ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsiblePersonId: responsiblePersonId || null, rootCause, correctiveAction, dueDate: dueDate || null, disposition }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to update the nonconformity");
        return;
      }
      router.refresh();
    });
  }

  function createReinspection() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(`/api/qc/nonconformities/${String(record.id)}/reinspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedToId: responsiblePersonId || null, dueDate: dueDate || null }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to create the reinspection task");
        return;
      }
      router.push(`/qc/tasks/${result.id}`);
    });
  }

  return (
    <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 }}>
      <SectionHeading title="Corrective Action and Disposition" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
        <label>Responsible User<select disabled={closed} style={field} value={responsiblePersonId} onChange={(event) => setResponsiblePersonId(event.target.value)}><option value="">Assign responsible user</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.email}</option>)}</select></label>
        <label>Due Date<input disabled={closed} type="date" style={field} value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label>
        <label>Disposition<select disabled={closed} style={field} value={disposition} onChange={(event) => setDisposition(event.target.value)}><option value="">Select ...</option>{["RELEASE", "REWORK", "REJECT", "RETURN", "DOWNGRADE", "SCRAP"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <div><small style={{ color: "#64748b" }}>Reinspection</small><div style={{ fontWeight: 700, marginTop: 7 }}>{reinspectionResult.replace(/_/g, " ")}</div><small style={{ color: "#64748b" }}>{String(record.reinspectionTestNo ?? record.reinspectionTaskNo ?? "No reinspection task yet")}</small></div>
      </div>
      <label style={{ display: "block", marginTop: 14 }}>Root Cause<textarea disabled={closed} style={{ ...field, minHeight: 90 }} value={rootCause} onChange={(event) => setRootCause(event.target.value)} /></label>
      <label style={{ display: "block", marginTop: 14 }}>Corrective Action<textarea disabled={closed} style={{ ...field, minHeight: 110 }} value={correctiveAction} onChange={(event) => setCorrectiveAction(event.target.value)} /></label>
      {!closed ? <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16, flexWrap: "wrap" }}><button disabled={pending} onClick={() => send(false)} style={{ ...field, width: "auto", paddingInline: 18, color: "#0f766e", fontWeight: 700 }}>Save Action</button><button disabled={pending || Boolean(reinspectionTaskId)} onClick={createReinspection} style={{ ...field, width: "auto", paddingInline: 18, color: "#0f766e", fontWeight: 700 }}>{reinspectionTaskId ? "Reinspection Task Created" : "Create Reinspection Task"}</button><button disabled={pending || !correctiveAction.trim() || reinspectionResult !== "PASSED"} onClick={() => send(true)} style={{ ...field, width: "auto", paddingInline: 18, background: "#00897b", color: "white", borderColor: "#00897b", fontWeight: 700 }}>Close Nonconformity</button></div> : null}
      {message ? <p style={{ color: "#b91c1c", marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
