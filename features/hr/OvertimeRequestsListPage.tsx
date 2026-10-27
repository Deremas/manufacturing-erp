"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Eye, FilePlus2, Pencil } from "lucide-react";

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
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";
import type { OvertimeRequest } from "./types";

export default function OvertimeRequestsListPage({ rows }: { rows: OvertimeRequest[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Overtime" },
  ];

  const filteredRows = useMemo(() => {
    const search = (filters.search ?? "").trim().toLowerCase();
    const status = (filters.status ?? "").trim();
    const location = (filters.location ?? "").trim();
    const shift = (filters.shiftCode ?? "").trim();

    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (location && row.locationName !== location) return false;
      if (shift && row.shiftCode !== shift) return false;
      if (!search) return true;
      return [
        row.overtimeNo,
        row.employeeNo,
        row.employeeName,
        row.reason,
        row.locationName,
        row.departmentName,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [filters, rows]);

  const filterFields: FilterField[] = [
    { type: "text", key: "search", label: "Search", placeholder: "Search overtime no, employee, or reason..." },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: Array.from(new Set(rows.map((row) => row.locationName).filter(Boolean))).map((value) => ({
        label: String(value),
        value: String(value),
      })),
    },
    {
      type: "select",
      key: "shiftCode",
      label: "Shift",
      placeholder: "All Shifts",
      options: Array.from(new Set(rows.map((row) => row.shiftCode).filter(Boolean))).map((value) => ({
        label: String(value),
        value: String(value),
      })),
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Draft", value: "DRAFT" },
        { label: "Submitted", value: "SUBMITTED" },
        { label: "Approved", value: "APPROVED" },
        { label: "Rejected", value: "REJECTED" },
        { label: "Posted", value: "POSTED" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
    },
  ];

  const columns: Column<OvertimeRequest>[] = [
    { key: "overtimeNo", label: "OT No", sortable: true },
    { key: "employeeName", label: "Employee", sortable: true },
    {
      key: "overtimeDate",
      label: "Date",
      sortable: true,
      render: (value) =>
        new Date(String(value)).toLocaleDateString("en-KE", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
    { key: "shiftCode", label: "Shift", render: (value) => value || "—" },
    { key: "hours", label: "Hours", sortable: true },
    { key: "amount", label: "Amount", sortable: true, render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: "locationName", label: "Location", render: (value) => value || "—" },
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
              : status === "REJECTED" || status === "CANCELLED"
                ? "rejected"
                : "draft";
        return <StatusBadge status={variant} />;
      },
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View overtime request",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(publicViewUrl("hr.overtime", (record as OvertimeRequest).publicId)),
    },
    {
      label: "Edit overtime request",
      icon: <Pencil size={16} />,
      onClick: (record) => router.push(publicEditUrl("hr.overtime", (record as OvertimeRequest).publicId)),
    },
  ];

  const actions: Action[] = [
    {
      label: "Create Overtime",
      variant: "primary",
      icon: <FilePlus2 size={16} />,
      onClick: () => router.push("/hr/overtime/create"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Overtime Management"
        subtitle="Manage employee overtime requests with live employees, shift references, and payroll-ready amounts."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <MetricCard label="Overtime Requests" value={rows.length} icon={<Clock3 size={18} />} color={colors.primary[600]} borderColor={colors.primary[400]} />
        <MetricCard label="Submitted" value={rows.filter((row) => row.status === "SUBMITTED").length} icon={<Clock3 size={18} />} color={colors.warning[700]} borderColor={colors.warning[400]} />
        <MetricCard label="Approved" value={rows.filter((row) => row.status === "APPROVED" || row.status === "POSTED").length} icon={<Clock3 size={18} />} color={colors.success[600]} borderColor={colors.success[400]} />
        <MetricCard label="Hours" value={rows.reduce((total, row) => total + Number(row.hours ?? 0), 0).toFixed(1)} icon={<Clock3 size={18} />} color={colors.primary[700]} borderColor={colors.primary[300]} />
      </div>

      <FilterCard title="Filter Overtime Requests" fields={filterFields} onFilter={setFilters} onReset={() => setFilters({})} />

      <DataTable
        columns={columns}
        data={filteredRows}
        actions={tableActions}
        recordCount={filteredRows.length}
        emptyState={
          <EmptyState
            icon={<Clock3 size={32} />}
            title="No overtime requests found"
            message="Overtime requests will appear here once supervisors and employees start entering live HR overtime records."
            action={{ label: "Create Overtime", onClick: () => router.push("/hr/overtime/create") }}
          />
        }
      />
    </div>
  );
}
