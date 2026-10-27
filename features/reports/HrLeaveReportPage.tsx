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
import type { HrLeaveReportRow } from "@/services/reports/hr-report.service";
import HrReportFilters from "./HrReportFilters";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE");
}

export default function HrLeaveReportPage({
  rows,
  refreshedAt,
  employees,
  locations,
  leaveTypes,
}: {
  rows: HrLeaveReportRow[];
  refreshedAt: string;
  employees: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
  leaveTypes: Array<{ value: string; label: string }>;
}) {
  const columns: Column<HrLeaveReportRow>[] = [
    { key: "leaveNo", label: "Leave No" },
    { key: "employeeNo", label: "Employee No" },
    { key: "employeeName", label: "Employee" },
    { key: "leaveTypeName", label: "Leave Type" },
    { key: "locationName", label: "Location", render: (value) => String(value ?? "-") },
    { key: "startDate", label: "Start", render: (value) => formatDate(String(value)) },
    { key: "endDate", label: "End", render: (value) => formatDate(String(value)) },
    { key: "days", label: "Days" },
    { key: "paid", label: "Paid", render: (value) => (value ? "Yes" : "No") },
    { key: "status", label: "Status" },
    { key: "finalApprovedByName", label: "Approved By", render: (value) => String(value ?? "-") },
  ];

  const exportRows = rows.map((row) => ({
    leaveNo: row.leaveNo,
    employeeNo: row.employeeNo,
    employeeName: row.employeeName,
    leaveType: row.leaveTypeName,
    location: row.locationName ?? "",
    startDate: formatDate(row.startDate),
    endDate: formatDate(row.endDate),
    days: row.days,
    paid: row.paid ? "Yes" : "No",
    status: row.status,
    requestedBy: row.requestedByName ?? "",
    approvedBy: row.finalApprovedByName ?? "",
  }));

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title="HR Leave Report"
          subtitle="Approved, pending, rejected, and cancelled leave requests from the live HR workflow."
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "HR Leave" },
          ]}
          refreshedAt={refreshedAt}
          actions={<ReportExportActions fileName="hr-leave-report" rows={exportRows} />}
        />
      }
      filters={
        <HrReportFilters
          employees={employees}
          locations={locations}
          leaveTypes={leaveTypes}
          extraStatusOptions={[
            { value: "APPROVED", label: "Approved" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "DRAFT", label: "Draft" },
            { value: "REJECTED", label: "Rejected" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          showLeaveType
        />
      }
      kpis={
        <ReportKpiGrid
          items={[
            { label: "Leave Requests", value: rows.length },
            { label: "Approved", value: rows.filter((row) => row.status === "APPROVED").length },
            { label: "Pending", value: rows.filter((row) => row.status === "SUBMITTED" || row.status === "DRAFT").length },
            { label: "Leave Days", value: rows.reduce((sum, row) => sum + Number(row.days ?? 0), 0) },
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
            title="No leave requests"
            message="No leave requests were found for the current HR reporting scope."
          />
        }
      />
    </ReportPageShell>
  );
}
