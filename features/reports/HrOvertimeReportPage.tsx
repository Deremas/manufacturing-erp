"use client";

import {
  ReportEmptyState,
  ReportExportActions,
  ReportHeader,
  ReportKpiGrid,
  ReportPageShell,
  ReportTable,
} from "@/components/reporting";
import type { Column } from "@/components/shared";
import type { HrOvertimeReportRow } from "@/services/reports/hr-report.service";
import HrReportFilters from "./HrReportFilters";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE");
}

function formatAmount(value: number) {
  return Number(value ?? 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function HrOvertimeReportPage({
  rows,
  refreshedAt,
  employees,
  locations,
}: {
  rows: HrOvertimeReportRow[];
  refreshedAt: string;
  employees: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
}) {
  const columns: Column<HrOvertimeReportRow>[] = [
    { key: "overtimeNo", label: "OT No" },
    { key: "overtimeDate", label: "Date", render: (value) => formatDate(String(value)) },
    { key: "employeeNo", label: "Employee No" },
    { key: "employeeName", label: "Employee" },
    { key: "locationName", label: "Location", render: (value) => String(value ?? "-") },
    { key: "shiftCode", label: "Shift", render: (value) => String(value ?? "-") },
    { key: "dayType", label: "Day Type" },
    { key: "hours", label: "Hours" },
    { key: "rateMultiplier", label: "Multiplier" },
    { key: "amount", label: "Amount", render: (value) => formatAmount(Number(value)) },
    { key: "status", label: "Status" },
    { key: "approvedByName", label: "Approved By", render: (value) => String(value ?? "-") },
  ];

  const exportRows = rows.map((row) => ({
    overtimeNo: row.overtimeNo,
    overtimeDate: formatDate(row.overtimeDate),
    employeeNo: row.employeeNo,
    employeeName: row.employeeName,
    location: row.locationName ?? "",
    shift: row.shiftCode ?? "",
    dayType: row.dayType,
    hours: row.hours,
    multiplier: row.rateMultiplier,
    amount: row.amount,
    status: row.status,
    approvedBy: row.approvedByName ?? "",
    reason: row.reason ?? "",
  }));

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title="HR Overtime Report"
          subtitle="Overtime requests, multipliers, and payable overtime amounts by day type."
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "HR Overtime" },
          ]}
          refreshedAt={refreshedAt}
          actions={<ReportExportActions fileName="hr-overtime-report" rows={exportRows} />}
        />
      }
      filters={
        <HrReportFilters
          employees={employees}
          locations={locations}
          leaveTypes={[]}
          extraStatusOptions={[
            { value: "APPROVED", label: "Approved" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "DRAFT", label: "Draft" },
            { value: "REJECTED", label: "Rejected" },
            { value: "CANCELLED", label: "Cancelled" },
            { value: "POSTED", label: "Posted" },
          ]}
        />
      }
      kpis={
        <ReportKpiGrid
          items={[
            { label: "Overtime Requests", value: rows.length },
            { label: "Approved", value: rows.filter((row) => row.status === "APPROVED" || row.status === "POSTED").length },
            { label: "Hours", value: rows.reduce((sum, row) => sum + Number(row.hours ?? 0), 0).toFixed(2) },
            { label: "Overtime Amount", value: formatAmount(rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0)) },
          ]}
        />
      }
    >
      <ReportTable
        columns={columns}
        data={rows}
        pageSize={15}
        emptyState={
          <ReportEmptyState
            title="No overtime requests"
            message="No overtime requests were found for the current HR reporting scope."
          />
        }
      />
    </ReportPageShell>
  );
}
