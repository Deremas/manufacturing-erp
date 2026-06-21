"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  HeroBanner,
  MetricCard,
  FilterCard,
  DataTable,
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
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Eye,
  History,
  ClipboardList,
  PlusCircle,
  Edit,
  Trash2,
  Activity,
  X,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface AuditLog {
  id: string;
  dateTime: string;
  user: string;
  module: string;
  action: string;
  entity: string;
  description: string;
  ipAddress: string;
  oldValue?: string;
  newValue?: string;
  userAgent?: string;
}

export interface AuditLogsPageProps {
  initialData?: AuditLog[];
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const metricsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "16px",
};

const modalOverlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
  width: "600px",
  maxHeight: "80vh",
  overflow: "auto",
  padding: "24px",
};

const jsonBlockStyle: React.CSSProperties = {
  backgroundColor: "#1e293b",
  color: "#e2e8f0",
  padding: "12px",
  borderRadius: radius.scale.sm,
  fontFamily: "monospace",
  fontSize: "12px",
  lineHeight: "1.6",
  overflowX: "auto",
  whiteSpace: "pre-wrap",
  maxHeight: "200px",
  overflow: "auto",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function AuditLogsPage({ initialData = [] }: AuditLogsPageProps) {
  const router = useRouter();
  const [data] = useState<AuditLog[]>(initialData);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Audit Logs" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "date",
      key: "dateFrom",
      label: "Date From",
      placeholder: "Start date",
    },
    { type: "date", key: "dateTo", label: "Date To", placeholder: "End date" },
    {
      type: "select",
      key: "action",
      label: "Action",
      placeholder: "All Actions",
      options: [
        { label: "Create", value: "CREATE" },
        { label: "Update", value: "UPDATE" },
        { label: "Delete", value: "DELETE" },
        { label: "View", value: "VIEW" },
      ],
    },
    {
      type: "select",
      key: "module",
      label: "Module",
      placeholder: "All Modules",
      options: [
        { label: "Administration", value: "Administration" },
        { label: "Procurement", value: "Procurement" },
        { label: "Inventory", value: "Inventory" },
        { label: "Production", value: "Production" },
        { label: "Sales", value: "Sales" },
        { label: "Finance", value: "Finance" },
      ],
    },
    {
      type: "text",
      key: "user",
      label: "User",
      placeholder: "Search by user...",
    },
  ];

  const columns: Column<AuditLog>[] = [
    {
      key: "dateTime",
      label: "Date/Time",
      sortable: true,
      render: (value) =>
        new Date(value as string).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
    { key: "user", label: "User", sortable: true },
    { key: "module", label: "Module", sortable: true },
    {
      key: "action",
      label: "Action",
      render: (value) => {
        const actionColors: Record<string, { bg: string; text: string }> = {
          CREATE: { bg: "#dcfce7", text: "#166534" },
          UPDATE: { bg: "#dbeafe", text: "#1e40af" },
          DELETE: { bg: "#fce4ec", text: "#c62828" },
          VIEW: { bg: "#f3f4f6", text: "#4b5563" },
        };
        const ac = actionColors[value as string] || {
          bg: "#f3f4f6",
          text: "#4b5563",
        };
        return (
          <span
            style={{
              padding: "2px 8px",
              borderRadius: radius.components.badge,
              backgroundColor: ac.bg,
              color: ac.text,
              fontSize: typography.sizes.caption.fontSize,
              fontWeight: typography.weights.medium,
            }}
          >
            {value as string}
          </span>
        );
      },
    },
    { key: "entity", label: "Entity" },
    {
      key: "description",
      label: "Description",
      render: (value) => (
        <span
          style={{
            color: colors.text.secondary,
            maxWidth: "200px",
            display: "inline-block",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {value as string}
        </span>
      ),
    },
    { key: "ipAddress", label: "IP Address" },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => setSelectedLog(record as AuditLog),
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<ClipboardList size={36} />}
      title="No Audit Logs Found"
      message="Audit logs will appear here as users perform actions in the system."
    />
  );

  const handleFilter = (values: Record<string, string>) =>
    console.log("Filter", values);
  const handleReset = () => console.log("Reset");

  return (
    <div style={pageStyle}>
      <HeroBanner
        title="Audit Logs"
        subtitle="Track all system activities and changes made by users."
        icon={<History size={24} />}
      />

      <div style={metricsRowStyle}>
        <MetricCard
          label="Total Events"
          value={data.length}
          icon={<Activity size={20} />}
          color={colors.primary[600]}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Creates"
          value={data.filter((l) => l.action === "CREATE").length}
          icon={<PlusCircle size={20} />}
          color={colors.success[600]}
          borderColor={colors.success[500]}
        />
        <MetricCard
          label="Updates"
          value={data.filter((l) => l.action === "UPDATE").length}
          icon={<Edit size={20} />}
          color={colors.primary[600]}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Deletes"
          value={data.filter((l) => l.action === "DELETE").length}
          icon={<Trash2 size={20} />}
          color={colors.danger[600]}
          borderColor={colors.danger[500]}
        />
      </div>

      <FilterCard
        title="Filter Audit Logs"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={data}
        actions={tableActions}
        emptyState={emptyState}
        recordCount={data.length}
      />

      {selectedLog && (
        <div style={modalOverlayStyle} onClick={() => setSelectedLog(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.h6.fontSize,
                  fontWeight: typography.weights.semibold,
                }}
              >
                Audit Log Details
              </h3>
              <button
                onClick={() => setSelectedLog(null)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "32px",
                  height: "32px",
                  border: "none",
                  borderRadius: radius.scale.sm,
                  backgroundColor: "transparent",
                  cursor: "pointer",
                  color: colors.text.muted,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                    }}
                  >
                    Date/Time
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: typography.weights.medium,
                    }}
                  >
                    {new Date(selectedLog.dateTime).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                    }}
                  >
                    User
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: typography.weights.medium,
                    }}
                  >
                    {selectedLog.user}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                    }}
                  >
                    Module
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: typography.weights.medium,
                    }}
                  >
                    {selectedLog.module}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                    }}
                  >
                    Action
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: typography.weights.medium,
                    }}
                  >
                    {selectedLog.action}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                    }}
                  >
                    Entity
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: typography.weights.medium,
                    }}
                  >
                    {selectedLog.entity}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                    }}
                  >
                    IP Address
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      fontWeight: typography.weights.medium,
                    }}
                  >
                    {selectedLog.ipAddress}
                  </div>
                </div>
              </div>

              <div>
                <div
                  style={{
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.text.muted,
                    marginBottom: "4px",
                  }}
                >
                  Description
                </div>
                <div style={{ fontSize: typography.sizes.body.fontSize }}>
                  {selectedLog.description}
                </div>
              </div>

              {selectedLog.oldValue && (
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                      marginBottom: "4px",
                    }}
                  >
                    Old Value (JSON)
                  </div>
                  <div style={jsonBlockStyle}>{selectedLog.oldValue}</div>
                </div>
              )}

              {selectedLog.newValue && (
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                      marginBottom: "4px",
                    }}
                  >
                    New Value (JSON)
                  </div>
                  <div style={jsonBlockStyle}>{selectedLog.newValue}</div>
                </div>
              )}

              {selectedLog.userAgent && (
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                      marginBottom: "4px",
                    }}
                  >
                    User Agent
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.small.fontSize,
                      color: colors.text.secondary,
                    }}
                  >
                    {selectedLog.userAgent}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
