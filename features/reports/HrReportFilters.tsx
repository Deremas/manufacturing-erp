"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ReportFilters } from "@/components/reporting";
import { colors } from "@/components/ui/colors";

type Option = { value: string; label: string };

const fieldStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: colors.text.secondary };
const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 42,
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: 12,
  padding: "10px 12px",
  fontSize: 14,
  backgroundColor: colors.surface,
  boxSizing: "border-box",
};

export default function HrReportFilters({
  employees,
  locations,
  leaveTypes,
  extraStatusOptions = [],
  showEmployee = true,
  showLocation = true,
  showStatus = true,
  showLeaveType = false,
  showSourceType = false,
}: {
  employees: Option[];
  locations: Option[];
  leaveTypes: Option[];
  extraStatusOptions?: Option[];
  showEmployee?: boolean;
  showLocation?: boolean;
  showStatus?: boolean;
  showLeaveType?: boolean;
  showSourceType?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") ?? "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") ?? "");
  const [employeeId, setEmployeeId] = useState(searchParams.get("employeeId") ?? "");
  const [locationId, setLocationId] = useState(searchParams.get("locationId") ?? "");
  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [leaveTypeId, setLeaveTypeId] = useState(searchParams.get("leaveTypeId") ?? "");
  const [sourceType, setSourceType] = useState(searchParams.get("sourceType") ?? "");

  const statusOptions = useMemo(() => {
    return [
      { value: "DRAFT", label: "Draft" },
      { value: "SUBMITTED", label: "Submitted" },
      { value: "APPROVED", label: "Approved" },
      { value: "POSTED", label: "Posted" },
      { value: "CANCELLED", label: "Cancelled" },
      { value: "REJECTED", label: "Rejected" },
      ...extraStatusOptions.filter((option, index, all) => all.findIndex((entry) => entry.value === option.value) === index),
    ];
  }, [extraStatusOptions]);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    const next = {
      dateFrom,
      dateTo,
      employeeId,
      locationId,
      status,
      leaveTypeId,
      sourceType,
    };

    Object.entries(next).forEach(([key, value]) => {
      if (value.trim()) {
        params.set(key, value.trim());
      } else {
        params.delete(key);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const resetFilters = () => {
    setDateFrom("");
    setDateTo("");
    setEmployeeId("");
    setLocationId("");
    setStatus("");
    setLeaveTypeId("");
    setSourceType("");
    router.push(pathname);
  };

  return (
    <ReportFilters title="Report Filters">
      <label style={fieldStyle}>
        <span style={labelStyle}>Date From</span>
        <input type="date" style={inputStyle} value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
      </label>
      <label style={fieldStyle}>
        <span style={labelStyle}>Date To</span>
        <input type="date" style={inputStyle} value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </label>
      {showEmployee ? (
        <label style={fieldStyle}>
          <span style={labelStyle}>Employee</span>
          <select style={inputStyle} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            <option value="">All employees</option>
            {employees.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : null}
      {showLocation ? (
        <label style={fieldStyle}>
          <span style={labelStyle}>Location</span>
          <select style={inputStyle} value={locationId} onChange={(event) => setLocationId(event.target.value)}>
            <option value="">All locations</option>
            {locations.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : null}
      {showStatus ? (
        <label style={fieldStyle}>
          <span style={labelStyle}>Status</span>
          <select style={inputStyle} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : null}
      {showLeaveType ? (
        <label style={fieldStyle}>
          <span style={labelStyle}>Leave Type</span>
          <select style={inputStyle} value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}>
            <option value="">All leave types</option>
            {leaveTypes.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ) : null}
      {showSourceType ? (
        <label style={fieldStyle}>
          <span style={labelStyle}>Source</span>
          <select style={inputStyle} value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
            <option value="">All sources</option>
            <option value="MANUAL">Manual</option>
            <option value="SHIFT">Shift Sync</option>
          </select>
        </label>
      ) : null}
      <div style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={applyFilters}
          style={{
            height: 42,
            borderRadius: 12,
            border: `1px solid ${colors.primary[400]}`,
            backgroundColor: colors.primary[600],
            color: "#fff",
            padding: "0 16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={resetFilters}
          style={{
            height: 42,
            borderRadius: 12,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            color: colors.text.primary,
            padding: "0 16px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reset
        </button>
      </div>
    </ReportFilters>
  );
}
