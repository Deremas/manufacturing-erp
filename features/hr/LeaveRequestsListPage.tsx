"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { spacing } from "@/components/ui/spacing";
import { Eye, FileClock, FilePlus2, Pencil, UserRound } from "lucide-react";
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";
import type { LeaveRequest } from "./types";

export default function LeaveRequestsListPage({ rows }: { rows: LeaveRequest[] }) {
  const router = useRouter();
  const [filters, setFilters] = useState<Record<string, string>>({});

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Leave" },
  ];

  const filteredRows = useMemo(() => {
    const search = (filters.search ?? "").trim().toLowerCase();
    const status = (filters.status ?? "").trim();
    const leaveType = (filters.leaveType ?? "").trim();
    const location = (filters.location ?? "").trim();

    return rows.filter((row) => {
      if (status && row.status !== status) return false;
      if (leaveType && row.leaveTypeName !== leaveType) return false;
      if (location && row.locationName !== location) return false;
      if (!search) return true;
      return [row.leaveNo, row.employeeNo, row.employeeName, row.leaveTypeName, row.departmentName, row.locationName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [filters, rows]);

  const filterFields: FilterField[] = [
    { type: "text", key: "search", label: "Search", placeholder: "Search leave no, employee, or leave type..." },
    {
      type: "select",
      key: "leaveType",
      label: "Leave Type",
      placeholder: "All Leave Types",
      options: Array.from(new Set(rows.map((row) => row.leaveTypeName))).map((value) => ({ label: value, value })),
    },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: Array.from(new Set(rows.map((row) => row.locationName).filter(Boolean))).map((value) => ({ label: String(value), value: String(value) })),
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
        { label: "Cancelled", value: "CANCELLED" },
      ],
    },
  ];

  const columns: Column<LeaveRequest>[] = [
    { key: "leaveNo", label: "Leave No", sortable: true },
    { key: "employeeName", label: "Employee", sortable: true },
    { key: "leaveTypeName", label: "Leave Type", sortable: true },
    {
      key: "startDate",
      label: "Start",
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }),
    },
    {
      key: "endDate",
      label: "End",
      sortable: true,
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" }),
    },
    { key: "days", label: "Days", sortable: true },
    { key: "locationName", label: "Location", sortable: true, render: (value) => value || "—" },
    {
      key: "status",
      label: "Status",
      render: (value) => {
        const status = String(value ?? "DRAFT");
        const variant =
          status === "APPROVED"
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
      label: "View leave request",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(publicViewUrl("hr.leave", (record as LeaveRequest).publicId)),
    },
    {
      label: "Edit leave request",
      icon: <Pencil size={16} />,
      onClick: (record) => router.push(publicEditUrl("hr.leave", (record as LeaveRequest).publicId)),
    },
  ];

  const pageActions: Action[] = [
    {
      label: "Create Leave Request",
      variant: "primary",
      icon: <FilePlus2 size={16} />,
      onClick: () => router.push("/hr/leave/create"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Leave Management"
        subtitle="Manage employee leave requests with live employee and leave type references from the HR database."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <MetricCard label="Leave Requests" value={rows.length} icon={<FileClock size={18} />} color={colors.primary[600]} borderColor={colors.primary[400]} />
        <MetricCard label="Submitted" value={rows.filter((row) => row.status === "SUBMITTED").length} icon={<UserRound size={18} />} color={colors.warning[700]} borderColor={colors.warning[400]} />
        <MetricCard label="Approved" value={rows.filter((row) => row.status === "APPROVED").length} icon={<UserRound size={18} />} color={colors.success[600]} borderColor={colors.success[400]} />
        <MetricCard label="Rejected / Cancelled" value={rows.filter((row) => row.status === "REJECTED" || row.status === "CANCELLED").length} icon={<UserRound size={18} />} color={colors.danger[600]} borderColor={colors.danger[400]} />
      </div>

      <FilterCard title="Filter Leave Requests" fields={filterFields} onFilter={setFilters} onReset={() => setFilters({})} />

      <DataTable
        columns={columns}
        data={filteredRows}
        actions={tableActions}
        recordCount={filteredRows.length}
        emptyState={
          <EmptyState
            icon={<FileClock size={32} />}
            title="No leave requests found"
            message="Leave requests will appear here once employees submit them into the live HR workflow."
            action={{ label: "Create Leave Request", onClick: () => router.push("/hr/leave/create") }}
          />
        }
      />
    </div>
  );
}
