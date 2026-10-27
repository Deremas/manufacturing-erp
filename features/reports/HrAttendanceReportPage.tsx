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
import type { HrAttendanceReportRow } from "@/services/reports/hr-report.service";
import HrReportFilters from "./HrReportFilters";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-KE");
}

export default function HrAttendanceReportPage({
  rows,
  refreshedAt,
  employees,
  locations,
}: {
  rows: HrAttendanceReportRow[];
  refreshedAt: string;
  employees: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
}) {
  const columns: Column<HrAttendanceReportRow>[] = [
    { key: "attendanceDate", label: "Date", render: (value) => formatDate(String(value)) },
    { key: "employeeNo", label: "Employee No" },
    { key: "employeeName", label: "Employee" },
    { key: "shiftCode", label: "Shift" },
    { key: "locationCode", label: "Location Code" },
    { key: "locationName", label: "Location" },
    { key: "userName", label: "User Account", render: (value) => String(value ?? "-") },
    { key: "sourceType", label: "Source" },
    { key: "hoursWorked", label: "Hours" },
    { key: "overtimeHours", label: "OT Hours" },
    { key: "status", label: "Status" },
    { key: "approvalStatus", label: "Approval" },
    { key: "approvedByName", label: "Approved By", render: (value) => String(value ?? "-") },
    { key: "remarks", label: "Remarks", render: (value) => String(value ?? "-") },
  ];

  const totalRows = rows.length;
  const presentRows = rows.filter((row) => row.status === "PRESENT").length;
  const absentRows = totalRows - presentRows;
  const uniquePeople = new Set(rows.map((row) => row.employeeId)).size;
  const exportRows = rows.map((row) => ({
    date: formatDate(row.attendanceDate),
    employeeNo: row.employeeNo,
    employeeName: row.employeeName,
    shift: row.shiftCode,
    locationCode: row.locationCode,
    locationName: row.locationName,
    userName: row.userName ?? "",
    sourceType: row.sourceType,
    hoursWorked: row.hoursWorked,
    overtimeHours: row.overtimeHours,
    status: row.status,
    approvalStatus: row.approvalStatus,
    approvedBy: row.approvedByName ?? "",
    remarks: row.remarks ?? "",
  }));

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title="HR Attendance Report"
          subtitle="Central daily attendance for shift and non-shift employees, scoped to the locations the user can access."
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "HR Attendance" },
          ]}
          refreshedAt={refreshedAt}
          actions={<ReportExportActions fileName="hr-attendance-report" rows={exportRows} />}
        />
      }
      filters={
        <HrReportFilters
          employees={employees}
          locations={locations}
          leaveTypes={[]}
          extraStatusOptions={[
            { value: "PRESENT", label: "Present" },
            { value: "ABSENT", label: "Absent" },
            { value: "LEAVE", label: "Leave" },
            { value: "OFF", label: "Off" },
            { value: "HOLIDAY", label: "Holiday" },
          ]}
          showLeaveType={false}
          showSourceType
        />
      }
      kpis={
        <ReportKpiGrid
          items={[
            { label: "Attendance Rows", value: totalRows },
            { label: "Present", value: presentRows },
            { label: "Absent", value: absentRows },
            { label: "People Covered", value: uniquePeople },
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
            title="No attendance records"
            message="No central daily attendance records were found for the current location scope."
          />
        }
      />
    </ReportPageShell>
  );
}
