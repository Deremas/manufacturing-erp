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
import type { HrPayrollReportRow } from "@/services/reports/hr-report.service";
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

export default function HrPayrollReportPage({
  rows,
  refreshedAt,
  locations,
}: {
  rows: HrPayrollReportRow[];
  refreshedAt: string;
  locations: Array<{ value: string; label: string }>;
}) {
  const columns: Column<HrPayrollReportRow>[] = [
    { key: "payrollNo", label: "Payroll No" },
    { key: "periodStart", label: "Period Start", render: (value) => formatDate(String(value)) },
    { key: "periodEnd", label: "Period End", render: (value) => formatDate(String(value)) },
    { key: "paymentDate", label: "Payment Date", render: (value) => formatDate(String(value)) },
    { key: "employeeCount", label: "Employees" },
    { key: "grossPay", label: "Gross Pay", render: (value) => formatAmount(Number(value)) },
    { key: "totalDeductions", label: "Deductions", render: (value) => formatAmount(Number(value)) },
    { key: "netPay", label: "Net Pay", render: (value) => formatAmount(Number(value)) },
    { key: "status", label: "Status" },
    { key: "postedByName", label: "Posted By", render: (value) => String(value ?? "-") },
  ];

  const exportRows = rows.map((row) => ({
    payrollNo: row.payrollNo,
    periodStart: formatDate(row.periodStart),
    periodEnd: formatDate(row.periodEnd),
    paymentDate: formatDate(row.paymentDate),
    employeeCount: row.employeeCount,
    grossPay: row.grossPay,
    totalDeductions: row.totalDeductions,
    netPay: row.netPay,
    status: row.status,
    createdBy: row.createdByName ?? "",
    approvedBy: row.approvedByName ?? "",
    postedBy: row.postedByName ?? "",
  }));

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title="HR Payroll Report"
          subtitle="Payroll runs, totals, and posting state from the live payroll engine."
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "HR Payroll" },
          ]}
          refreshedAt={refreshedAt}
          actions={<ReportExportActions fileName="hr-payroll-report" rows={exportRows} />}
        />
      }
      filters={
        <HrReportFilters
          employees={[]}
          locations={locations}
          leaveTypes={[]}
          extraStatusOptions={[
            { value: "DRAFT", label: "Draft" },
            { value: "SUBMITTED", label: "Submitted" },
            { value: "APPROVED", label: "Approved" },
            { value: "POSTED", label: "Posted" },
            { value: "CANCELLED", label: "Cancelled" },
          ]}
          showEmployee={false}
        />
      }
      kpis={
        <ReportKpiGrid
          items={[
            { label: "Payroll Runs", value: rows.length },
            { label: "Posted Runs", value: rows.filter((row) => row.status === "POSTED").length },
            { label: "Employees Covered", value: rows.reduce((sum, row) => sum + Number(row.employeeCount ?? 0), 0) },
            { label: "Net Pay Total", value: formatAmount(rows.reduce((sum, row) => sum + Number(row.netPay ?? 0), 0)) },
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
            title="No payroll runs"
            message="No payroll runs were found for the current HR reporting scope."
          />
        }
      />
    </ReportPageShell>
  );
}
