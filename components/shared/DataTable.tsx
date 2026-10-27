"use client";

import React from "react";
import Link from "next/link";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { useAccess } from "@/lib/auth/use-access";
import { useSystemPreferences } from "@/lib/client/use-system-preferences";
import { formatMoney, formatQuantity } from "@/lib/utils/format-number";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface Column<T = any> {
  key: string;
  label: string;
  render?: (value: unknown, record: T, index: number) => any;
  sortable?: boolean;
  format?: "qty" | "decimal" | "money";
  width?: number | string;
  align?: "left" | "center" | "right";
  wrap?: boolean;
}

export interface TableAction {
  label: string;
  icon?: React.ReactNode;
  onClick?: (record: any) => void;
  color?: string;
  style?: React.CSSProperties;
  show?: (record: any) => boolean;
  permission?: string | string[];
  href?: string | ((record: any) => string);
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: Column<any>[];
  data: T[];
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
  minWidth: 0,
  maxWidth: "100%",
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
  userSelect: "text",
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
  width: "168px",
  padding: "10px 8px 10px 0",
  textAlign: "right",
  whiteSpace: "nowrap",
};

const actionsHeaderStyle: React.CSSProperties = {
  ...headerCellStyle,
  width: "168px",
  textAlign: "right",
  padding: "10px 8px 10px 0",
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
export default function DataTable<T = Record<string, unknown>>({
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
  const { visibleActions } = useAccess();
  const { currencyCode } = useSystemPreferences();
  const allowedActions = visibleActions(actions ?? []);
  const hasExplicitWidths = columns.some((column) => column.width != null);
  const tableMinWidth = hasExplicitWidths
    ? Math.max(
        columns.reduce(
          (sum, column) => sum + (typeof column.width === "number" ? column.width : 140),
          0,
        ),
        720,
      )
    : Math.max(columns.length * 140, 720);

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
      <div className="erp-table-scroll" style={{ overflowX: "auto", minWidth: 0, maxWidth: "100%", width: "100%" }}>
        <table
          style={{
            ...tableStyle,
            tableLayout: hasExplicitWidths ? "fixed" : "auto",
            minWidth: tableMinWidth,
          }}
        >
          <thead>
            <tr style={headerRowStyle}>
              {columns.map((col) => {
                const columnStyle = col.width
                  ? {
                      width: col.width,
                      maxWidth: col.width,
                    }
                  : {};
                const alignStyle = {
                  textAlign: col.align ?? "left",
                };
                return (
                  <th
                    key={col.key}
                    style={{ ...headerCellStyle, ...columnStyle, ...alignStyle }}
                  >
                    {col.label}
                  </th>
                );
              })}
              {allowedActions.length > 0 && (
                <th key="__actions" style={actionsHeaderStyle}>
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
                {columns.map((col) => {
                  const rawValue = (record as Record<string, unknown>)[col.key];
                  const cellContent = col.render
                    ? col.render(rawValue, record, rowIndex)
                    : col.format === "qty"
                      ? formatQuantity(rawValue)
                      : col.format === "money"
                        ? formatMoney(rawValue, currencyCode)
                        : col.format === "decimal"
                          ? formatMoney(rawValue)
                          : String(rawValue ?? "");

                  const cellStyleWithWidth = col.width
                    ? {
                        ...cellStyle,
                        width: col.width,
                        maxWidth: col.width,
                        overflow: col.wrap ? "visible" : "hidden",
                        textOverflow: col.wrap ? "clip" : "ellipsis",
                        whiteSpace: col.wrap ? "normal" : "nowrap",
                        wordBreak: col.wrap ? "break-word" : "normal",
                      }
                    : cellStyle;
                  const cellStyleWithAlign = {
                    ...cellStyleWithWidth,
                    textAlign: col.align ?? "left",
                  };

                  return (
                  <td key={col.key} style={cellStyleWithAlign}>
                    {cellContent}
                  </td>
                  );
                })}
                {allowedActions.length > 0 && (
                  <td key="__actions" style={actionsCellStyle}>
                    {allowedActions
                      .filter((action) => action.show?.(record) !== false)
                      .map((action, actIdx) => (
                      action.href ? (
                        <Link
                          key={actIdx}
                          href={
                            typeof action.href === "function"
                              ? action.href(record)
                              : action.href
                          }
                          title={action.label}
                          aria-label={action.label}
                          style={{ ...iconButtonStyle(action.color), ...action.style, textDecoration: "none" }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = colors.secondary[100];
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                          }}
                        >
                          {action.icon ?? (
                            <span style={{ fontSize: 11, fontWeight: 600 }}>
                              {action.label}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <button
                          key={actIdx}
                          title={action.label}
                          aria-label={action.label}
                          style={{ ...iconButtonStyle(action.color), ...action.style }}
                          onClick={() => action.onClick?.(record as Record<string, unknown>)}
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
                          {action.icon ?? (
                            <span style={{ fontSize: 11, fontWeight: 600 }}>
                              {action.label}
                            </span>
                          )}
                        </button>
                      )
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
