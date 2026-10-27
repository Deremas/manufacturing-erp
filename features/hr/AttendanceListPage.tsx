"use client";

import React, { useMemo, useState } from "react";
import { CalendarCheck2, Check, Pencil, RotateCcw, Save, ThumbsDown, Trash2, Upload, Users, UserCheck, UserX, X } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ActionButtons,
  DataTable,
  EmptyState,
  FilterCard,
  FormCard,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import type { Action, Breadcrumb, Column, FilterField, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import type { AttendanceRow, BulkAttendanceEntry, MonthlyAttendanceDay, OptionItem } from "./types";

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.text.secondary };
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 44,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 15,
  backgroundColor: colors.surface,
  boxSizing: "border-box",
};

type AttendanceFormState = {
  id?: string;
  employeeId: string;
  attendanceDate: string;
  locationId: string;
  status: string;
  hoursWorked: string;
  overtimeHours: string;
  remarks: string;
};

function createEmptyForm(): AttendanceFormState {
  return {
    employeeId: "",
    attendanceDate: new Date().toISOString().slice(0, 10),
    locationId: "",
    status: "PRESENT",
    hoursWorked: "1",
    overtimeHours: "0",
    remarks: "",
  };
}

function createBaseForm(employeeId?: string): AttendanceFormState {
  return {
    ...createEmptyForm(),
    employeeId: employeeId ?? "",
  };
}

function createBulkEntries(employees: OptionItem[], selectedEmployeeId?: string): BulkAttendanceEntry[] {
  const filteredEmployees = selectedEmployeeId
    ? employees.filter((employee) => employee.value === selectedEmployeeId)
    : employees;

  return filteredEmployees.map((employee) => ({
    employeeId: employee.value,
    employeeLabel: employee.label,
    status: "PRESENT",
    hoursWorked: "1",
    overtimeHours: "0",
    remarks: "",
    selected: Boolean(selectedEmployeeId),
  }));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function mapStatusBadge(status: string) {
  switch (status) {
    case "PRESENT":
      return "approved";
    case "ABSENT":
      return "rejected";
    case "LEAVE":
      return "pending";
    case "HOLIDAY":
      return "active";
    default:
      return "draft";
  }
}

function mapApprovalBadge(status?: string) {
  switch (status) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    default:
      return "draft";
  }
}

export interface AttendanceListPageProps {
  rows: AttendanceRow[];
  employees: OptionItem[];
  locations: OptionItem[];
  statusOptions: OptionItem[];
  selectedEmployeeId?: string;
}

export default function AttendanceListPage({
  rows,
  employees,
  locations,
  statusOptions,
  selectedEmployeeId,
}: AttendanceListPageProps) {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [items, setItems] = useState(rows);
  const [form, setForm] = useState<AttendanceFormState>(() => createBaseForm(selectedEmployeeId));
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().slice(0, 10));
  const [bulkLocationId, setBulkLocationId] = useState("");
  const [bulkEntries, setBulkEntries] = useState<BulkAttendanceEntry[]>(() => createBulkEntries(employees, selectedEmployeeId));
  const [bulkSaving, setBulkSaving] = useState(false);
  const [sheetEmployeeId, setSheetEmployeeId] = useState(selectedEmployeeId ?? "");
  const [sheetMonth, setSheetMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sheetDays, setSheetDays] = useState<MonthlyAttendanceDay[]>([]);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetSaving, setSheetSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Attendance" },
  ];

  const employeeLabelById = useMemo(() => new Map(employees.map((item) => [item.value, item.label])), [employees]);
  const selectedEmployeeLabel = employeeLabelById.get(selectedEmployeeId ?? form.employeeId);
  const selectedBulkCount = bulkEntries.filter((entry) => entry.selected).length;

  const refreshRows = async () => {
    const refreshed = await fetch(selectedEmployeeId ? `/api/hr/attendance?employeeId=${encodeURIComponent(selectedEmployeeId)}` : "/api/hr/attendance").then((res) => res.json()) as { items: AttendanceRow[] };
    setItems(refreshed.items);
  };

  const filteredRows = useMemo(() => {
    const search = (filters.search ?? "").trim().toLowerCase();
    const sourceType = (filters.sourceType ?? "").trim();
    const location = (filters.location ?? "").trim();
    const status = (filters.status ?? "").trim();
    const approval = (filters.approval ?? "").trim();

    return items.filter((row) => {
      if (sourceType && row.sourceType !== sourceType) return false;
      if (location && row.locationName !== location) return false;
      if (status && row.status !== status) return false;
      if (approval && row.approvalStatus !== approval) return false;
      if (!search) return true;
      return [row.employeeNo, row.employeeName, row.locationName, row.shiftCode, row.userName, row.approvedByName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [filters, items]);

  const filterFields: FilterField[] = [
    { type: "text", key: "search", label: "Search", placeholder: "Search by employee, approver, location, or shift..." },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: Array.from(new Set(items.map((row) => row.locationName).filter(Boolean))).map((value) => ({
        label: String(value),
        value: String(value),
      })),
    },
    {
      type: "select",
      key: "sourceType",
      label: "Source",
      placeholder: "All Sources",
      options: [
        { label: "Manual", value: "MANUAL" },
        { label: "Shift Sync", value: "SHIFT" },
      ],
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: statusOptions,
    },
    {
      type: "select",
      key: "approval",
      label: "Approval",
      placeholder: "All Approval States",
      options: [
        { label: "Draft", value: "DRAFT" },
        { label: "Approved", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" },
      ],
    },
  ];

  const columns: Column<AttendanceRow>[] = [
    { key: "attendanceDate", label: "Date", sortable: true, render: (value) => formatDate(String(value)) },
    { key: "employeeNo", label: "Employee No", sortable: true },
    { key: "employeeName", label: "Employee", sortable: true },
    { key: "locationName", label: "Location", sortable: true, render: (value) => value || "—" },
    { key: "sourceType", label: "Source", sortable: true },
    { key: "shiftCode", label: "Shift", sortable: true, render: (value) => value || "—" },
    { key: "hoursWorked", label: "Hours", sortable: true },
    { key: "overtimeHours", label: "OT Hours", sortable: true },
    {
      key: "approvalStatus",
      label: "Approval",
      render: (value) => <StatusBadge status={mapApprovalBadge(String(value ?? "DRAFT"))} />,
    },
    {
      key: "status",
      label: "Attendance",
      render: (value) => <StatusBadge status={mapStatusBadge(String(value ?? "ABSENT"))} />,
    },
    { key: "approvedByName", label: "Approved By", render: (value) => value || "—" },
    { key: "remarks", label: "Remarks", render: (value) => value || "—" },
  ];

  const editing = Boolean(form.id);

  const changeApproval = async (record: AttendanceRow, action: "approve" | "reject" | "reset", successMessage: string) => {
    setError("");
    setMessage("");
    const response = await fetch(`/api/hr/attendance/${record.id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) {
      setError(payload?.error ?? "Failed to change attendance approval state.");
      return;
    }
    await refreshRows();
    setMessage(successMessage);
    router.refresh();
  };

  const tableActions: TableAction[] = [
    {
      label: "Edit attendance",
      icon: <Pencil size={16} />,
      onClick: (record) => {
        if (record.sourceType === "SHIFT") {
          setError("Shift-synced attendance should be corrected from the shift session, not from HR attendance.");
          return;
        }
        if (record.approvalStatus === "APPROVED") {
          setError("Approved attendance must be reset or rejected before editing.");
          return;
        }
        setError("");
        setMessage("");
        setForm({
          id: record.id,
          employeeId: record.employeeId,
          attendanceDate: record.attendanceDate.slice(0, 10),
          locationId: record.locationId ?? "",
          status: record.status,
          hoursWorked: String(record.hoursWorked ?? 0),
          overtimeHours: String(record.overtimeHours ?? 0),
          remarks: record.remarks ?? "",
        });
      },
    },
    {
      label: "Approve",
      icon: <Check size={16} />,
      onClick: (record) => changeApproval(record, "approve", "Attendance approved."),
    },
    {
      label: "Reject",
      icon: <ThumbsDown size={16} />,
      color: colors.warning[700],
      onClick: (record) => changeApproval(record, "reject", "Attendance rejected."),
    },
    {
      label: "Reset approval",
      icon: <RotateCcw size={16} />,
      onClick: (record) => changeApproval(record, "reset", "Attendance approval reset."),
    },
    {
      label: "Archive attendance",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        setError("");
        setMessage("");
        const response = await fetch(`/api/hr/attendance/${record.id}`, { method: "DELETE" });
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (!response.ok) {
          setError(payload?.error ?? "Failed to archive attendance.");
          return;
        }
        setItems((current) => current.filter((item) => item.id !== record.id));
        if (form.id === record.id) {
          setForm(createBaseForm(selectedEmployeeId));
        }
        setMessage("Attendance record archived.");
        router.refresh();
      },
    },
  ];

  const save = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(form.id ? `/api/hr/attendance/${form.id}` : "/api/hr/attendance", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: form.employeeId,
          attendanceDate: form.attendanceDate,
          locationId: form.locationId || null,
          status: form.status,
          hoursWorked: Number(form.hoursWorked),
          overtimeHours: Number(form.overtimeHours),
          remarks: form.remarks,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to save attendance.");
        return;
      }

      await refreshRows();
      setForm(createBaseForm(selectedEmployeeId));
      setMessage(editing ? "Attendance updated." : "Attendance recorded.");
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const saveBulk = async () => {
    setBulkSaving(true);
    setError("");
    setMessage("");
    try {
      const selectedEntries = bulkEntries.filter((entry) => entry.selected).map((entry) => ({
        employeeId: entry.employeeId,
        status: entry.status,
        hoursWorked: Number(entry.hoursWorked),
        overtimeHours: Number(entry.overtimeHours),
        remarks: entry.remarks,
      }));

      const response = await fetch("/api/hr/attendance/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendanceDate: bulkDate,
          locationId: bulkLocationId || null,
          entries: selectedEntries,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { error?: string; count?: number } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to save bulk attendance.");
        return;
      }

      await refreshRows();
      setBulkEntries(createBulkEntries(employees, selectedEmployeeId));
      setMessage(`Bulk attendance saved for ${payload?.count ?? selectedEntries.length} employee(s).`);
      router.refresh();
    } finally {
      setBulkSaving(false);
    }
  };

  const loadMonthlySheet = async () => {
    if (!sheetEmployeeId || !sheetMonth) {
      setError("Select employee and month before loading the monthly attendance sheet.");
      return;
    }
    setSheetLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/hr/attendance/monthly?employeeId=${encodeURIComponent(sheetEmployeeId)}&month=${encodeURIComponent(sheetMonth)}`);
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
        sheet?: {
          days: Array<{
            attendanceDate: string;
            dayLabel: string;
            status: string;
            approvalStatus?: string;
            hoursWorked: number;
            overtimeHours: number;
            remarks?: string | null;
            existingId?: string;
          }>;
        };
      } | null;
      if (!response.ok || !payload?.sheet) {
        setError(payload?.error ?? "Failed to load monthly attendance sheet.");
        return;
      }
      setSheetDays(payload.sheet.days.map((day) => ({
        attendanceDate: day.attendanceDate,
        dayLabel: day.dayLabel,
        status: day.status,
        approvalStatus: day.approvalStatus ?? "DRAFT",
        hoursWorked: String(day.hoursWorked ?? 0),
        overtimeHours: String(day.overtimeHours ?? 0),
        remarks: day.remarks ?? "",
        existingId: day.existingId,
      })));
    } finally {
      setSheetLoading(false);
    }
  };

  const saveMonthlySheet = async () => {
    if (!sheetEmployeeId || !sheetMonth || !sheetDays.length) {
      setError("Load a monthly attendance sheet before saving.");
      return;
    }
    setSheetSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/hr/attendance/monthly", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: sheetEmployeeId,
          month: sheetMonth,
          days: sheetDays.map((day) => ({
            attendanceDate: day.attendanceDate,
            status: day.status,
            hoursWorked: Number(day.hoursWorked),
            overtimeHours: Number(day.overtimeHours),
            remarks: day.remarks,
          })),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; count?: number } | null;
      if (!response.ok) {
        setError(payload?.error ?? "Failed to save monthly attendance sheet.");
        return;
      }
      await loadMonthlySheet();
      await refreshRows();
      setMessage(`Monthly attendance saved for ${payload?.count ?? sheetDays.length} day(s).`);
      router.refresh();
    } finally {
      setSheetSaving(false);
    }
  };

  const actions: Action[] = [
    {
      label: editing ? "Clear" : "Reset",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => setForm(createBaseForm(selectedEmployeeId)),
      disabled: saving,
    },
    {
      label: editing ? "Update Attendance" : "Record Attendance",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: save,
      loading: saving,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Attendance"
        subtitle={
          selectedEmployeeLabel
            ? `This attendance view is scoped to ${selectedEmployeeLabel}. Shift attendance syncs here automatically, and HR can still record non-shift attendance manually.`
            : "This is the central daily attendance ledger for payroll. Shift attendance syncs here automatically, and non-shift employees can be recorded manually."
        }
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={[{ label: "Import Attendance", icon: <Upload size={16} />, variant: "secondary", onClick: () => router.push("/hr/attendance/import") }]} />}
      />

      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.danger[50], border: `1px solid ${colors.danger[200]}`, color: colors.danger[700] }}>{error}</div> : null}
      {message ? <div style={{ padding: "12px 14px", borderRadius: 12, backgroundColor: colors.success[50], border: `1px solid ${colors.success[200]}`, color: colors.success[700] }}>{message}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <MetricCard label="Attendance Rows" value={items.length} icon={<CalendarCheck2 size={18} />} color={colors.primary[600]} borderColor={colors.primary[400]} />
        <MetricCard label="Present" value={items.filter((row) => row.status === "PRESENT").length} icon={<UserCheck size={18} />} color={colors.success[600]} borderColor={colors.success[400]} />
        <MetricCard label="Absent" value={items.filter((row) => row.status === "ABSENT").length} icon={<UserX size={18} />} color={colors.danger[600]} borderColor={colors.danger[400]} />
        <MetricCard label="People Covered" value={new Set(items.map((row) => row.employeeId)).size} icon={<Users size={18} />} color={colors.warning[700]} borderColor={colors.warning[400]} />
      </div>

      <FormCard title={editing ? "Edit Daily Attendance" : "Record Daily Attendance"} variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <label style={fieldStyle}>
            <span style={labelStyle}>Employee</span>
            <select
              style={inputStyle}
              value={form.employeeId}
              onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
              disabled={Boolean(selectedEmployeeId)}
            >
              <option value="">Select ...</option>
              {employees.map((employee) => <option key={employee.value} value={employee.value}>{employee.label}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Attendance Date</span>
            <input type="date" style={inputStyle} value={form.attendanceDate} onChange={(event) => setForm((current) => ({ ...current, attendanceDate: event.target.value }))} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Location</span>
            <select style={inputStyle} value={form.locationId} onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}>
              <option value="">Use employee location</option>
              {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Status</span>
            <select style={inputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Hours Worked</span>
            <input type="number" min="0" step="0.5" style={inputStyle} value={form.hoursWorked} onChange={(event) => setForm((current) => ({ ...current, hoursWorked: event.target.value }))} />
          </label>
          <label style={fieldStyle}>
            <span style={labelStyle}>Overtime Hours</span>
            <input type="number" min="0" step="0.5" style={inputStyle} value={form.overtimeHours} onChange={(event) => setForm((current) => ({ ...current, overtimeHours: event.target.value }))} />
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Remarks</span>
            <textarea style={{ ...inputStyle, height: 96, resize: "vertical" }} value={form.remarks} onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))} />
          </label>
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ color: colors.text.secondary, fontSize: 13 }}>
            {form.employeeId ? `Selected: ${employeeLabelById.get(form.employeeId) ?? "Employee"}` : "Manual attendance is for non-shift staff. Shift-based attendance syncs automatically from shift sessions."}
          </div>
          <ActionButtons actions={actions} />
        </div>
      </FormCard>

      <FormCard title="Bulk Daily Attendance" variant="default">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Attendance Date</span>
              <input type="date" style={inputStyle} value={bulkDate} onChange={(event) => setBulkDate(event.target.value)} />
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Location</span>
              <select style={inputStyle} value={bulkLocationId} onChange={(event) => setBulkLocationId(event.target.value)}>
                <option value="">Use employee locations</option>
                {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: colors.text.secondary, fontSize: 13 }}>
              {selectedEmployeeLabel
                ? `Bulk entry is scoped to ${selectedEmployeeLabel}.`
                : "Use this for non-shift employees or for quick daily catch-up when shift sync is not the source."}
            </div>
            {!selectedEmployeeId ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => setBulkEntries((current) => current.map((entry) => ({ ...entry, selected: true })))} style={{ borderRadius: 10, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}>
                  Select all
                </button>
                <button type="button" onClick={() => setBulkEntries((current) => current.map((entry) => ({ ...entry, selected: false })))} style={{ borderRadius: 10, border: `1px solid ${colors.border}`, backgroundColor: colors.surface, padding: "8px 12px", cursor: "pointer", fontWeight: 600 }}>
                  Clear selection
                </button>
              </div>
            ) : null}
          </div>

          <div style={{ overflowX: "auto", border: `1px solid ${colors.border}`, borderRadius: 14 }}>
            <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", backgroundColor: colors.surface }}>
              <thead>
                <tr style={{ backgroundColor: colors.secondary[50] }}>
                  {["Use", "Employee", "Status", "Hours", "OT Hours", "Remarks"].map((label) => (
                    <th key={label} style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, color: colors.text.secondary, borderBottom: `1px solid ${colors.border}` }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bulkEntries.map((entry, index) => (
                  <tr key={entry.employeeId}>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                      <input type="checkbox" checked={entry.selected} onChange={(event) => setBulkEntries((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, selected: event.target.checked } : row))} disabled={Boolean(selectedEmployeeId)} />
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}`, fontWeight: 600 }}>{entry.employeeLabel}</td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                      <select style={{ ...inputStyle, height: 40 }} value={entry.status} onChange={(event) => setBulkEntries((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, status: event.target.value } : row))}>
                        {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                      <input type="number" min="0" step="0.5" style={{ ...inputStyle, height: 40 }} value={entry.hoursWorked} onChange={(event) => setBulkEntries((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, hoursWorked: event.target.value } : row))} />
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                      <input type="number" min="0" step="0.5" style={{ ...inputStyle, height: 40 }} value={entry.overtimeHours} onChange={(event) => setBulkEntries((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, overtimeHours: event.target.value } : row))} />
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                      <input type="text" style={{ ...inputStyle, height: 40 }} value={entry.remarks} onChange={(event) => setBulkEntries((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, remarks: event.target.value } : row))} placeholder="Remarks" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ color: colors.text.secondary, fontSize: 13 }}>
              Ready to save {selectedBulkCount} employee(s) for {formatDate(bulkDate)}.
            </div>
            <button type="button" onClick={saveBulk} disabled={bulkSaving} style={{ borderRadius: 12, border: `1px solid ${colors.primary[400]}`, backgroundColor: colors.primary[600], color: "#fff", padding: "10px 16px", fontWeight: 700, cursor: bulkSaving ? "wait" : "pointer", opacity: bulkSaving ? 0.75 : 1 }}>
              {bulkSaving ? "Saving bulk attendance..." : "Save Bulk Attendance"}
            </button>
          </div>
        </div>
      </FormCard>

      <FormCard title="Monthly Attendance Sheet" variant="default">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <label style={fieldStyle}>
              <span style={labelStyle}>Employee</span>
              <select style={inputStyle} value={sheetEmployeeId} onChange={(event) => setSheetEmployeeId(event.target.value)} disabled={Boolean(selectedEmployeeId)}>
                <option value="">Select ...</option>
                {employees.map((employee) => <option key={employee.value} value={employee.value}>{employee.label}</option>)}
              </select>
            </label>
            <label style={fieldStyle}>
              <span style={labelStyle}>Month</span>
              <input type="month" style={inputStyle} value={sheetMonth} onChange={(event) => setSheetMonth(event.target.value)} />
            </label>
            <button type="button" onClick={loadMonthlySheet} style={{ ...inputStyle, cursor: "pointer", fontWeight: 700, color: colors.primary[700], backgroundColor: colors.primary[50] }}>
              {sheetLoading ? "Loading..." : "Load Sheet"}
            </button>
            <button type="button" onClick={saveMonthlySheet} style={{ ...inputStyle, cursor: "pointer", fontWeight: 700, color: "#fff", backgroundColor: colors.primary[600] }}>
              {sheetSaving ? "Saving..." : "Save Sheet"}
            </button>
          </div>

          {sheetDays.length ? (
            <div style={{ overflowX: "auto", border: `1px solid ${colors.border}`, borderRadius: 14 }}>
              <table style={{ width: "100%", minWidth: 920, borderCollapse: "collapse", backgroundColor: colors.surface }}>
                <thead>
                  <tr style={{ backgroundColor: colors.secondary[50] }}>
                    {["Date", "Day", "Status", "Approval", "Hours", "OT Hours", "Remarks"].map((label) => (
                      <th key={label} style={{ textAlign: "left", padding: "12px 14px", fontSize: 13, color: colors.text.secondary, borderBottom: `1px solid ${colors.border}` }}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheetDays.map((day, index) => (
                    <tr key={day.attendanceDate}>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>{formatDate(day.attendanceDate)}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>{day.dayLabel}</td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                        <select style={{ ...inputStyle, height: 40 }} value={day.status} disabled={day.approvalStatus === "APPROVED"} onChange={(event) => setSheetDays((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, status: event.target.value } : row))}>
                          {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}><StatusBadge status={mapApprovalBadge(day.approvalStatus)} /></td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                        <input type="number" min="0" step="0.5" style={{ ...inputStyle, height: 40 }} value={day.hoursWorked} disabled={day.approvalStatus === "APPROVED"} onChange={(event) => setSheetDays((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, hoursWorked: event.target.value } : row))} />
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                        <input type="number" min="0" step="0.5" style={{ ...inputStyle, height: 40 }} value={day.overtimeHours} disabled={day.approvalStatus === "APPROVED"} onChange={(event) => setSheetDays((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, overtimeHours: event.target.value } : row))} />
                      </td>
                      <td style={{ padding: "12px 14px", borderBottom: `1px solid ${colors.border}` }}>
                        <input type="text" style={{ ...inputStyle, height: 40 }} value={day.remarks} disabled={day.approvalStatus === "APPROVED"} onChange={(event) => setSheetDays((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, remarks: event.target.value } : row))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ color: colors.text.secondary, fontSize: 14 }}>
              Load an employee and month to review or update a monthly attendance sheet.
            </div>
          )}
        </div>
      </FormCard>

      <FilterCard title="Filter Attendance" fields={filterFields} onFilter={setFilters} onReset={() => setFilters({})} />

      <DataTable
        columns={columns}
        data={filteredRows}
        actions={tableActions}
        recordCount={filteredRows.length}
        emptyState={<EmptyState title="No attendance records" message="Shift attendance will sync here automatically, and HR can add manual daily attendance for non-shift employees." />}
      />
    </div>
  );
}
