"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Eye, FilePlus2 } from "lucide-react";

import {
  ActionButtons,
  DataTable,
  EmptyState,
  FilterCard,
  MetricCard,
  PageHeader,
  StatusBadge,
} from "@/components/shared";
import type { Action, Breadcrumb, Column, FilterField, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { publicViewUrl } from "@/lib/routing/urls";
import type { PayrollRun } from "./types";

export default function PayrollRunsListPage({ rows }: { rows: PayrollRun[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Payroll" },
  ];

  const filteredRows = useMemo(() => {
    const search = (filters.search ?? "").trim().toLowerCase();
    const status = (filters.status ?? "").trim();

    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (!search) return true;
      return [row.payrollNo, row.createdByName, row.approvedByName, row.postedByName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [filters, rows]);

  const filterFields: FilterField[] = [
    { type: "text", key: "search", label: "Search", placeholder: "Search payroll no or approver..." },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Draft", value: "DRAFT" },
        { label: "Submitted", value: "SUBMITTED" },
        { label: "Approved", value: "APPROVED" },
        { label: "Posted", value: "POSTED" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
    },
  ];

  const columns: Column<PayrollRun>[] = [
    { key: "payrollNo", label: "Payroll No", sortable: true },
    {
      key: "periodStart",
      label: "Period Start",
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }),
    },
    {
      key: "periodEnd",
      label: "Period End",
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }),
    },
    {
      key: "paymentDate",
      label: "Payment Date",
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }),
    },
    { key: "employeeCount", label: "Employees", sortable: true },
    { key: "grossPay", label: "Gross Pay", sortable: true, render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: "netPay", label: "Net Pay", sortable: true, render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    {
      key: "status",
      label: "Status",
      render: (value) => {
        const status = String(value ?? "DRAFT");
        const variant =
          status === "APPROVED" || status === "POSTED"
            ? "approved"
            : status === "SUBMITTED"
              ? "pending"
              : status === "CANCELLED"
                ? "rejected"
                : "draft";
        return <StatusBadge status={variant} />;
      },
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View payroll run",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(publicViewUrl("hr.payroll", (record as PayrollRun).publicId)),
    },
  ];

  const actions: Action[] = [
    {
      label: "Generate Payroll",
      variant: "primary",
      icon: <FilePlus2 size={16} />,
      onClick: () => router.push("/hr/payroll/create"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Payroll"
        subtitle="Generate, review, approve, and post payroll runs from live employee and overtime records."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <MetricCard label="Payroll Runs" value={rows.length} icon={<Calculator size={18} />} color={colors.primary[600]} borderColor={colors.primary[400]} />
        <MetricCard label="Draft" value={rows.filter((row) => row.status === "DRAFT").length} icon={<Calculator size={18} />} color={colors.warning[700]} borderColor={colors.warning[400]} />
        <MetricCard label="Approved / Posted" value={rows.filter((row) => row.status === "APPROVED" || row.status === "POSTED").length} icon={<Calculator size={18} />} color={colors.success[600]} borderColor={colors.success[400]} />
        <MetricCard label="Net Pay Total" value={rows.reduce((total, row) => total + Number(row.netPay ?? 0), 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} icon={<Calculator size={18} />} color={colors.primary[700]} borderColor={colors.primary[300]} />
      </div>

      <FilterCard title="Filter Payroll Runs" fields={filterFields} onFilter={setFilters} onReset={() => setFilters({})} />

      <DataTable
        columns={columns}
        data={filteredRows}
        actions={tableActions}
        recordCount={filteredRows.length}
        emptyState={
          <EmptyState
            icon={<Calculator size={32} />}
            title="No payroll runs found"
            message="Generate the first payroll run to calculate salaries, overtime, and deductions from the live HR database."
            action={{ label: "Generate Payroll", onClick: () => router.push("/hr/payroll/create") }}
          />
        }
      />
    </div>
  );
}
