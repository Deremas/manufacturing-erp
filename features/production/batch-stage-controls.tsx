"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { SectionHeading } from "@/components/shared";

type Stage = { id: string; code: string; name: string; sequence: number };
type Machine = { value: string; label: string };
type Execution = { id?: unknown; status?: unknown; name?: unknown };

const inputStyle = {
  minHeight: 44,
  border: "1px solid #94a3b8",
  borderRadius: 10,
  padding: "9px 11px",
  background: "white",
} as const;

export function BatchStageControls({
  batchId,
  stages,
  machines,
  executions,
}: {
  batchId: string;
  stages: Stage[];
  machines: Machine[];
  executions: Execution[];
}) {
  const router = useRouter();
  const current = executions.find((entry) => ["ACTIVE", "ON_HOLD", "REWORK"].includes(String(entry.status)));
  const currentStatus = String(current?.status ?? "");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [machineId, setMachineId] = useState("");
  const [outputQty, setOutputQty] = useState(0);
  const [wastageQty, setWastageQty] = useState(0);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(path: string, body: Record<string, unknown>) {
    startTransition(async () => {
      setMessage("");
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to update the production stage");
        return;
      }
      setReason("");
      router.refresh();
    });
  }

  return (
    <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 }}>
      <SectionHeading
        title="Production Stage Control"
        subtitle={
          current
            ? `${currentStatus === "ACTIVE" ? "Active" : currentStatus === "ON_HOLD" ? "On hold" : "Rework"} stage: ${String(current.name ?? "Stage")}`
            : "Start the next configured stage for this batch."
        }
      />

      {!current ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginTop: 18 }}>
          <select style={inputStyle} value={stageId} onChange={(event) => setStageId(event.target.value)}>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.code} - {stage.name}</option>)}
          </select>
          <select style={inputStyle} value={machineId} onChange={(event) => setMachineId(event.target.value)}>
            <option value="">No machine assignment</option>
            {machines.map((machine) => <option key={machine.value} value={machine.value}>{machine.label}</option>)}
          </select>
          <button disabled={pending || !stageId} onClick={() => submit("/api/production/batch-stages", { batchId, stageId, machineId: machineId || null })} style={{ ...inputStyle, borderColor: "#00897b", background: "#00897b", color: "white", fontWeight: 700 }}>
            Start Stage
          </button>
        </div>
      ) : currentStatus !== "ACTIVE" ? (
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 18 }}>
          <p style={{ color: "#64748b", margin: 0 }}>Resume this stage before recording output or starting another stage.</p>
          <button disabled={pending} onClick={() => submit(`/api/production/batch-stages/${String(current.id)}`, { action: "RESUME" })} style={{ ...inputStyle, borderColor: "#00897b", background: "#00897b", color: "white", fontWeight: 700 }}>
            Resume Stage
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
            <input type="number" min={0} style={inputStyle} value={outputQty || ""} placeholder="Stage output quantity" onChange={(event) => setOutputQty(Number(event.target.value))} />
            <input type="number" min={0} style={inputStyle} value={wastageQty || ""} placeholder="Stage wastage quantity" onChange={(event) => setWastageQty(Number(event.target.value))} />
            <button disabled={pending} onClick={() => submit(`/api/production/batch-stages/${String(current.id)}`, { action: "COMPLETE", outputQty, wastageQty })} style={{ ...inputStyle, borderColor: "#00897b", background: "#00897b", color: "white", fontWeight: 700 }}>
              Complete Stage
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) repeat(3,minmax(105px,auto))", gap: 10, overflowX: "auto" }}>
            <input style={inputStyle} value={reason} placeholder="Reason required for hold, rework, or cancellation" onChange={(event) => setReason(event.target.value)} />
            {(["HOLD", "REWORK", "CANCEL"] as const).map((action) => (
              <button key={action} disabled={pending || !reason.trim()} onClick={() => submit(`/api/production/batch-stages/${String(current.id)}`, { action, reason })} style={{ ...inputStyle, color: action === "CANCEL" ? "#b91c1c" : "#0f766e", fontWeight: 700 }}>
                {action === "HOLD" ? "Place on Hold" : action === "REWORK" ? "Send to Rework" : "Cancel Stage"}
              </button>
            ))}
          </div>
        </div>
      )}
      {message ? <p style={{ color: "#b91c1c", marginBottom: 0 }}>{message}</p> : null}
    </section>
  );
}
