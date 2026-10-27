"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import type { ShiftDefinition } from "@/services/production/production-shared.service";

const inputStyle = { height: 46, border: `1px solid ${colors.inputBorder}`, borderRadius: 11, padding: "0 12px", background: "#fff", width: "100%", boxSizing: "border-box" as const };

export default function HrShiftsPage({ initialShifts }: { initialShifts: ShiftDefinition[] }) {
  const [shifts, setShifts] = useState<ShiftDefinition[]>(initialShifts.length ? initialShifts : [{ code: "", name: "", startTime: "", endTime: "" }]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const update = (index: number, key: keyof ShiftDefinition, value: string) => setShifts((current) => current.map((shift, rowIndex) => rowIndex === index ? { ...shift, [key]: key === "code" ? value.toUpperCase() : value } : shift));
  const save = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/hr/shifts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ shifts }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to save shifts");
      setShifts(payload.items);
      setMessage("Shift definitions saved. Attendance, overtime, employee, and production forms now use these values.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Failed to save shifts"); } finally { setBusy(false); }
  };

  return <div style={{ display: "grid", gap: 24 }}>
    <PageHeader title="Shift Definitions" subtitle="Manage the shared shifts used by HR attendance, overtime, employees, and production sessions." breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Shift Definitions" }]} actions={<ActionButtons actions={[{ label: "Add Shift", icon: <Plus size={16} />, variant: "secondary", onClick: () => setShifts((current) => [...current, { code: "", name: "", startTime: "", endTime: "" }]) }, { label: busy ? "Saving..." : "Save Shifts", icon: <Save size={16} />, variant: "primary", disabled: busy, onClick: save }]} />} />
    {error ? <div style={{ color: colors.danger[700], background: colors.danger[50], border: `1px solid ${colors.danger[200]}`, padding: 13, borderRadius: 12 }}>{error}</div> : null}
    {message ? <div style={{ color: colors.success[700], background: colors.success[50], border: `1px solid ${colors.success[200]}`, padding: 13, borderRadius: 12 }}>{message}</div> : null}
    <FormCard title="Working Shifts" variant="teal-header">
      <div style={{ overflowX: "auto" }}><div style={{ minWidth: 760, display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 170px 170px 32px", gap: 10, color: colors.text.secondary, fontSize: 12, fontWeight: 750, textTransform: "uppercase" }}><span>Code</span><span>Name</span><span>Start Time</span><span>End Time</span><span /></div>
        {shifts.map((shift, index) => <div key={`${shift.code}-${index}`} style={{ display: "grid", gridTemplateColumns: "150px 1fr 170px 170px 32px", gap: 10 }}>
          <input style={inputStyle} value={shift.code} placeholder="Code" onChange={(event) => update(index, "code", event.target.value)} />
          <input style={inputStyle} value={shift.name} placeholder="Shift name" onChange={(event) => update(index, "name", event.target.value)} />
          <input style={inputStyle} type="time" value={shift.startTime ?? ""} onChange={(event) => update(index, "startTime", event.target.value)} />
          <input style={inputStyle} type="time" value={shift.endTime ?? ""} onChange={(event) => update(index, "endTime", event.target.value)} />
          <button type="button" className="erp-remove-row-btn" title={index === 0 ? "Clear shift" : "Remove shift"} aria-label={index === 0 ? "Clear shift" : "Remove shift"} onClick={() => setShifts((current) => blankOrRemoveRow(current, index, { code: "", name: "", startTime: "", endTime: "" }))} style={{ border: "1px solid #fecaca", borderRadius: 6, color: "#dc2626", background: "#fff1f2" }}><Trash2 size={14} /></button>
        </div>)}
      </div></div>
    </FormCard>
  </div>;
}
