"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { ActionButtons, EmptyState, FormCard, PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import type { MaintenanceWorkOrder } from "@/features/maintenance/types";

type ChecklistItem = {
  id: string;
  sequence: number;
  task: string;
  instructions: string | null;
  isMandatory: boolean;
  expectedResult: string | null;
  completed: boolean;
  result: string | null;
  reading: string | null;
  remarks: string | null;
  completedByName: string | null;
  completedAt: string | null;
};

const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", border: `1px solid ${colors.inputBorder}`, borderRadius: 10, background: "white" };

export function PMChecklistPage({ workOrder, initialItems }: { workOrder: MaintenanceWorkOrder | null; initialItems: ChecklistItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  if (!workOrder) return <EmptyState title="Work order not found" message="The requested work order does not exist." />;
  const currentWorkOrder = workOrder;

  function update(id: string, patch: Partial<ChecklistItem>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function save(item: ChecklistItem) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/maintenance/work-orders/${currentWorkOrder.id}/pm-checklist`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId: item.id, completed: item.completed, result: item.result, reading: item.reading, remarks: item.remarks }),
      });
      const body = await response.json();
      if (!response.ok) return setMessage(body.error ?? "Failed to save checklist task");
      setItems(body.items);
      setMessage("Checklist task saved.");
      router.refresh();
    });
  }

  return <div style={{ padding: 24, display: "grid", gap: 20, background: "#f8fafc" }}>
    <PageHeader title={`PM Checklist · ${currentWorkOrder.workOrderNo}`} subtitle="Every mandatory task must be completed before the work order completion gate opens." breadcrumbs={[{ label: "Maintenance", href: "/maintenance" }, { label: "Work Orders", href: "/maintenance/work-orders" }, { label: currentWorkOrder.workOrderNo, href: `/maintenance/work-orders/${currentWorkOrder.id}` }, { label: "PM Checklist" }]} />
    {message ? <div style={{ color: message.startsWith("Failed") ? colors.danger[600] : colors.primary[700], fontWeight: 700 }}>{message}</div> : null}
    {!items.length ? <EmptyState title="No PM checklist" message="This work order was not generated from a structured PM plan, or its plan has no checklist tasks." /> : items.map((item) => <FormCard key={item.id} title={`${item.sequence}. ${item.task}${item.isMandatory ? " *" : ""}`} variant="teal-header" footer={{ actions: <ActionButtons actions={[{ label: "Save Task", icon: <CheckCircle2 size={16} />, variant: "primary", loading: isPending, onClick: () => save(item) }]} /> }}>
      {item.instructions ? <p style={{ color: colors.text.secondary }}>{item.instructions}</p> : null}
      <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 1fr", gap: 12 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}><input type="checkbox" checked={item.completed} onChange={(event) => update(item.id, { completed: event.target.checked })} /> Completed</label>
        <input style={inputStyle} value={item.result ?? ""} onChange={(event) => update(item.id, { result: event.target.value })} placeholder={item.expectedResult ?? "Result / finding"} />
        <input style={inputStyle} value={item.reading ?? ""} onChange={(event) => update(item.id, { reading: event.target.value })} placeholder="Reading (optional)" />
      </div>
      <textarea style={{ ...inputStyle, minHeight: 80, marginTop: 12 }} value={item.remarks ?? ""} onChange={(event) => update(item.id, { remarks: event.target.value })} placeholder="Remarks" />
      {item.completedAt ? <div style={{ marginTop: 8, color: colors.text.secondary }}>Recorded by {item.completedByName ?? "user"} on {new Date(item.completedAt).toLocaleString("en-KE")}</div> : null}
    </FormCard>)}
  </div>;
}
