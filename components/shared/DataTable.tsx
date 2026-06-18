"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface Column<T = any> {
  key: string;
  label: string;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
}

export interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick: (record: any) => void;
  color?: string;
}

export interface DataTableProps {
  columns: Column[];
  data: Record<string, unknown>[];
  actions?: TableAction[];
  loading?: boolean;
  emptyState?: React.ReactNode;
  recordCount?: number;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  onPageChange?: (page: number) => void;
  page?: number;
  pageSize?: number;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
  overflow: "hidden",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
};

const headerRowStyle: React.CSSProperties = {
  backgroundColor: "#f9fafb",
};

const headerCellStyle: React.CSSProperties = {
  padding: "10px 14px",
  textAlign: "left",
  fontWeight: typography.weights.semibold,
  fontSize: typography.sizes.small.fontSize,
  color: colors.text.secondary,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: "nowrap",
  userSelect: "none",
};

const sortableHeaderStyle: React.CSSProperties = {
  ...headerCellStyle,
  cursor: "pointer",
};

const sortIconStyle: React.CSSProperties = {
  marginLeft: "4px",
  fontSize: "10px",
};

const cellStyle: React.CSSProperties = {
  padding: "10px 14px",
  color: colors.text.primary,
  borderBottom: `1px solid ${colors.border}`,
  fontSize: typography.sizes.body.fontSize,
};

const rowHoverStyle: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
};

const actionsCellStyle: React.CSSProperties = {
  ...cellStyle,
  textAlign: "right",
  whiteSpace: "nowrap",
};

const iconButtonStyle = (color?: string): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  border: "none",
  borderRadius: radius.scale.sm,
  backgroundColor: "transparent",
  color: color ?? colors.text.secondary,
  cursor: "pointer",
  fontSize: "16px",
  transition: "background-color 0.15s",
});

const loadingOverlayStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px",
  color: colors.text.muted,
  fontSize: typography.sizes.body.fontSize,
};

const emptyStateStyle: React.CSSProperties = {
  padding: "40px",
};

const paginationContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  borderTop: `1px solid ${colors.border}`,
  backgroundColor: "#f9fafb",
};

const paginationInfoStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  color: colors.text.secondary,
};

const paginationButtonStyle = (disabled: boolean): React.CSSProperties => ({
  padding: "6px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.button,
  backgroundColor: disabled ? colors.secondary[50] : colors.surface,
  color: disabled ? colors.text.muted : colors.text.primary,
  cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.medium,
  marginLeft: "6px",
});

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  actions,
  loading,
  emptyState,
  recordCount,
  onSort,
  onPageChange,
  page,
  pageSize,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc";
    setSortKey(key);
    setSortDir(newDir);
    onSort?.(key, newDir);
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingOverlayStyle}>Loading...</div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>{emptyState}</div>
      </div>
    );
  }

  const totalPages = pageSize
    ? Math.ceil((recordCount ?? data.length) / pageSize)
    : 1;
  const currentPage = page ?? 1;

  return (
    <div style={containerStyle}>
      <div style={{ overflowX: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr style={headerRowStyle}>
              {columns.map((col) => {
                const isSortable = col.sortable ?? false;
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    style={
                      isSortable
                        ? { ...sortableHeaderStyle, cursor: "pointer" }
                        : headerCellStyle
                    }
                    onClick={() => isSortable && handleSort(col.key)}
                  >
                    {col.label}
                    {isSortable && (
                      <span style={sortIconStyle}>
                        {isActive
                          ? sortDir === "asc"
                            ? "\u25B2"
                            : "\u25BC"
                          : "\u25B4\u25BE"}
                      </span>
                    )}
                  </th>
                );
              })}
              {actions && actions.length > 0 && (
                <th key="__actions" style={headerCellStyle}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((record, rowIndex) => (
              <tr
                key={
                  ((record as Record<string, unknown>).id as string) ?? rowIndex
                }
                style={{ transition: "background-color 0.1s" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "#f3f4f6";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "";
                }}
              >
                {columns.map((col) => (
                  <td key={col.key} style={cellStyle}>
                    {col.render
                      ? col.render(
                          (record as Record<string, unknown>)[col.key],
                          record,
                          rowIndex,
                        )
                      : String(
                          (record as Record<string, unknown>)[col.key] ?? "",
                        )}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td key="__actions" style={actionsCellStyle}>
                    {actions.map((action, actIdx) => (
                      <button
                        key={actIdx}
                        title={action.label}
                        style={iconButtonStyle(action.color)}
                        onClick={() =>
                          action.onClick(record as Record<string, unknown>)
                        }
                        onMouseEnter={(e) => {
                          (
                            e.currentTarget as HTMLElement
                          ).style.backgroundColor = colors.secondary[100];
                        }}
                        onMouseLeave={(e) => {
                          (
                            e.currentTarget as HTMLElement
                          ).style.backgroundColor = "transparent";
                        }}
                      >
                        {action.icon}
                      </button>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={paginationContainerStyle}>
          <span style={paginationInfoStyle}>
            Showing {(currentPage - 1) * (pageSize ?? 10) + 1}-
            {Math.min(
              currentPage * (pageSize ?? 10),
              recordCount ?? data.length,
            )}{" "}
            of {recordCount ?? data.length}
          </span>
          <div>
            <button
              style={paginationButtonStyle(currentPage <= 1)}
              disabled={currentPage <= 1}
              onClick={() => onPageChange?.(currentPage - 1)}
            >
              Previous
            </button>
            <button
              style={paginationButtonStyle(currentPage >= totalPages)}
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange?.(currentPage + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
