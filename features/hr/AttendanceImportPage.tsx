"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, X } from "lucide-react";
import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";

type ImportRow = { employeeNo: string; attendanceDate: string; status: string; hoursWorked: number; overtimeHours: number; remarks: string };

function parseCsv(text: string): ImportRow[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((value) => value.trim());
    const get = (name: string) => values[headers.indexOf(name)] ?? "";
    return { employeeNo: get("employeeno"), attendanceDate: get("attendancedate"), status: get("status") || "PRESENT", hoursWorked: Number(get("hoursworked") || 0), overtimeHours: Number(get("overtimehours") || 0), remarks: get("remarks") };
  }).filter((row) => row.employeeNo && row.attendanceDate);
}

export default function AttendanceImportPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const downloadTemplate = () => {
    const content = "employeeNo,attendanceDate,status,hoursWorked,overtimeHours,remarks\nEMP-001,2026-07-14,PRESENT,8,0,Normal day";
    const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "text/csv" })); link.download = "attendance-import-template.csv"; link.click(); URL.revokeObjectURL(link.href);
  };
  const submit = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/hr/attendance/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Import failed");
      setMessage(`Imported ${payload.imported} attendance row(s). ${payload.failed ? `${payload.failed} row(s) need correction.` : ""}`);
      if (!payload.failed) setRows([]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Import failed"); } finally { setBusy(false); }
  };

  return <div style={{ display: "grid", gap: 24 }}>
    <PageHeader title="Import Attendance" subtitle="Import device or spreadsheet attendance into the same approved daily ledger used by payroll." breadcrumbs={[{ label: "HR", href: "/hr" }, { label: "Attendance", href: "/hr/attendance" }, { label: "Import" }]} />
    {error ? <div style={{ color: colors.danger[700], background: colors.danger[50], border: `1px solid ${colors.danger[200]}`, padding: 13, borderRadius: 12 }}>{error}</div> : null}
    {message ? <div style={{ color: colors.success[700], background: colors.success[50], border: `1px solid ${colors.success[200]}`, padding: 13, borderRadius: 12 }}>{message}</div> : null}
    <FormCard title="CSV Import" variant="teal-header">
      <div style={{ display: "grid", gap: 16 }}><p style={{ margin: 0, color: colors.text.secondary }}>Required columns: employeeNo, attendanceDate, status. Optional columns: hoursWorked, overtimeHours, remarks.</p><input type="file" accept=".csv,text/csv" onChange={async (event) => { const file = event.target.files?.[0]; if (file) setRows(parseCsv(await file.text())); }} /><div><strong>{rows.length}</strong> valid row(s) ready to import.</div>{rows.length ? <div style={{ overflowX: "auto" }}><table style={{ minWidth: 760, width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Employee", "Date", "Status", "Hours", "OT", "Remarks"].map((label) => <th key={label} style={{ textAlign: "left", padding: 10, background: "#f8fafc" }}>{label}</th>)}</tr></thead><tbody>{rows.slice(0, 12).map((row, index) => <tr key={`${row.employeeNo}-${row.attendanceDate}-${index}`} style={{ borderTop: `1px solid ${colors.border}` }}><td style={{ padding: 10 }}>{row.employeeNo}</td><td>{row.attendanceDate}</td><td>{row.status}</td><td>{row.hoursWorked}</td><td>{row.overtimeHours}</td><td>{row.remarks}</td></tr>)}</tbody></table></div> : null}</div>
    </FormCard>
    <ActionButtons actions={[{ label: "Back", icon: <X size={16} />, variant: "secondary", onClick: () => router.push("/hr/attendance") }, { label: "Download Template", icon: <Download size={16} />, variant: "secondary", onClick: downloadTemplate }, { label: busy ? "Importing..." : "Import Attendance", icon: <Upload size={16} />, variant: "primary", onClick: submit, disabled: busy || !rows.length }]} />
  </div>;
}
