"use client";

import React, { useState } from "react";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  FilterField,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { AuditLog } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { radius } from "@/components/ui/radius";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockAuditLogs: AuditLog[] = [
  {
    id: "audit-1",
    userId: "usr-1",
    userName: "John Doe",
    action: "CREATE",
    module: "Procurement",
    recordId: "PO-2026-01245",
    oldValue: "",
    newValue: '{"status": "draft", "total": 12500}',
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: "2026-06-18T08:30:00Z",
  },
  {
    id: "audit-2",
    userId: "usr-2",
    userName: "Jane Smith",
    action: "APPROVE",
    module: "Procurement",
    recordId: "PO-2026-01244",
    oldValue: '{"status": "pending"}',
    newValue: '{"status": "approved"}',
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    timestamp: "2026-06-18T08:15:00Z",
  },
  {
    id: "audit-3",
    userId: "usr-3",
    userName: "Bob Johnson",
    action: "UPDATE",
    module: "Inventory",
    recordId: "ITM-001",
    oldValue: '{"quantity": 150}',
    newValue: '{"quantity": 145}',
    ipAddress: "192.168.1.102",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: "2026-06-18T08:00:00Z",
  },
  {
    id: "audit-4",
    userId: "usr-1",
    userName: "John Doe",
    action: "DELETE",
    module: "Master Data",
    recordId: "CUST-005",
    oldValue: '{"name": "Old Customer"}',
    newValue: "",
    ipAddress: "192.168.1.100",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: "2026-06-17T16:45:00Z",
  },
  {
    id: "audit-5",
    userId: "usr-4",
    userName: "Alice Williams",
    action: "CREATE",
    module: "Sales",
    recordId: "SALE-2026-01567",
    oldValue: "",
    newValue: '{"customer": "Acme Corp", "total": 8500}',
    ipAddress: "192.168.1.103",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)",
    timestamp: "2026-06-17T14:20:00Z",
  },
  {
    id: "audit-6",
    userId: "usr-5",
    userName: "Charlie Brown",
    action: "EXPORT",
    module: "Reports",
    recordId: "RPT-FIN-2026-Q2",
    oldValue: "",
    newValue: "",
    ipAddress: "192.168.1.104",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: "2026-06-17T11:10:00Z",
  },
  {
    id: "audit-7",
    userId: "usr-2",
    userName: "Jane Smith",
    action: "LOGIN",
    module: "Administration",
    recordId: "usr-2",
    oldValue: "",
    newValue: "",
    ipAddress: "192.168.1.101",
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    timestamp: "2026-06-17T09:00:00Z",
  },
  {
    id: "audit-8",
    userId: "usr-3",
    userName: "Bob Johnson",
    action: "UPDATE",
    module: "Production",
    recordId: "PROD-2026-00456",
    oldValue: '{"status": "in-progress"}',
    newValue: '{"status": "completed"}',
    ipAddress: "192.168.1.102",
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    timestamp: "2026-06-17T08:30:00Z",
  },
];

// ----------------------------------------------------------------------------
// Helper
// ----------------------------------------------------------------------------
function getActionBadgeVariant(
  action: string,
): "active" | "approved" | "rejected" | "pending" | "inactive" {
  const upper = action.toUpperCase();
  if (upper === "CREATE" || upper === "LOGIN") return "active";
  if (upper === "APPROVE") return "approved";
  if (upper === "DELETE" || upper === "REJECT") return "rejected";
  if (upper === "UPDATE") return "pending";
  return "inactive";
}

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function AuditLogsPage() {
  const [data] = useState<AuditLog[]>(mockAuditLogs);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Audit Logs" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "dateRange",
      key: "dateRange",
      label: "Date Range",
    },
    {
      type: "select",
      key: "module",
      label: "Module",
      placeholder: "All Modules",
      options: [
        { label: "Procurement", value: "Procurement" },
        { label: "Inventory", value: "Inventory" },
        { label: "Production", value: "Production" },
        { label: "Sales", value: "Sales" },
        { label: "Finance", value: "Finance" },
        { label: "Reports", value: "Reports" },
        { label: "Administration", value: "Administration" },
        { label: "Master Data", value: "Master Data" },
      ],
    },
    {
      type: "select",
      key: "action",
      label: "Action",
      placeholder: "All Actions",
      options: [
        { label: "Create", value: "CREATE" },
        { label: "Update", value: "UPDATE" },
        { label: "Delete", value: "DELETE" },
        { label: "Approve", value: "APPROVE" },
        { label: "Export", value: "EXPORT" },
        { label: "Login", value: "LOGIN" },
      ],
    },
    {
      type: "text",
      key: "user",
      label: "User",
      placeholder: "Search by user name...",
    },
  ];

  const columns: Column<AuditLog>[] = [
    {
      key: "timestamp",
      label: "Timestamp",
      sortable: true,
      render: (value) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {new Date(value as string).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
    { key: "userName", label: "User", sortable: true },
    {
      key: "action",
      label: "Action",
      render: (value) => (
        <StatusBadge
          status={getActionBadgeVariant(value as string)}
          size="sm"
        />
      ),
    },
    {
      key: "module",
      label: "Module",
      sortable: true,
      render: (value) => (
        <span
          style={{
            backgroundColor: colors.info[50],
            color: colors.info[700],
            padding: "2px 8px",
            borderRadius: radius.components.badge,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: typography.weights.medium,
          }}
        >
          {value as string}
        </span>
      ),
    },
    {
      key: "recordId",
      label: "Record ID",
      render: (value) => (
        <span
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            fontSize: typography.sizes.caption.fontSize,
            color: colors.text.secondary,
          }}
        >
          {value as string}
        </span>
      ),
    },
    {
      key: "oldValue",
      label: "Old Value",
      render: (value) =>
        value ? (
          <span
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              fontSize: typography.sizes.caption.fontSize,
              color: colors.danger[600],
              maxWidth: "150px",
              display: "inline-block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={value as string}
          >
            {(value as string).slice(0, 40)}
            {(value as string).length > 40 ? "..." : ""}
          </span>
        ) : (
          <span style={{ color: colors.text.muted }}>—</span>
        ),
    },
    {
      key: "newValue",
      label: "New Value",
      render: (value) =>
        value ? (
          <span
            style={{
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
              fontSize: typography.sizes.caption.fontSize,
              color: colors.success[600],
              maxWidth: "150px",
              display: "inline-block",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={value as string}
          >
            {(value as string).slice(0, 40)}
            {(value as string).length > 40 ? "..." : ""}
          </span>
        ) : (
          <span style={{ color: colors.text.muted }}>—</span>
        ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (value) => (
        <span
          style={{
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
            fontSize: typography.sizes.caption.fontSize,
            color: colors.text.secondary,
          }}
        >
          {value as string}
        </span>
      ),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Audit Logs Found"
      message="There are no audit logs matching your criteria."
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "primary",
      onClick: () => console.log("Export audit logs"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    console.log("Filters reset");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Audit Logs"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Audit Logs"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={data}
        emptyState={emptyState}
        recordCount={data.length}
        page={1}
        pageSize={20}
      />
    </div>
  );
}
