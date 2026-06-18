"use client";

import React from "react";
import { PageHeader, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface ModulePermission {
  module: string;
  label: string;
  permissions: string[];
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))",
  gap: "16px",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
  overflow: "hidden",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 20px",
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: "#f9fafb",
};

const cardTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  lineHeight: typography.sizes.body.lineHeight,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
};

const cardBodyStyle: React.CSSProperties = {
  padding: "16px 20px",
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const badgeStyle = (variant: "active" | "inactive"): React.CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "5px 12px",
  borderRadius: radius.components.badge,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  lineHeight: 1.4,
  whiteSpace: "nowrap",
  backgroundColor:
    variant === "active" ? colors.primary[50] : colors.secondary[50],
  color: variant === "active" ? colors.primary[700] : colors.text.secondary,
  border: `1px solid ${
    variant === "active" ? colors.primary[200] : colors.border
  }`,
  cursor: "default",
  userSelect: "none",
});

const checkboxStyle: React.CSSProperties = {
  width: "14px",
  height: "14px",
  cursor: "default",
  accentColor: colors.primary[600],
};

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const modules: ModulePermission[] = [
  {
    module: "procurement",
    label: "Procurement",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "inventory",
    label: "Inventory",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "production",
    label: "Production",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "sales",
    label: "Sales",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "finance",
    label: "Finance",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "hr",
    label: "Human Resources",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "reports",
    label: "Reports",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "administration",
    label: "Administration",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
  {
    module: "master-data",
    label: "Master Data",
    permissions: [
      "view",
      "create",
      "edit",
      "delete",
      "approve",
      "print",
      "export",
    ],
  },
];

// Permission action display labels
const actionLabels: Record<string, string> = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  print: "Print",
  export: "Export",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function PermissionsPage() {
  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Permissions" },
  ];

  return (
    <div style={containerStyle}>
      <PageHeader title="Permissions" breadcrumbs={breadcrumbs} />

      <p
        style={{
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.body.fontSize,
          color: colors.text.secondary,
          margin: 0,
        }}
      >
        Manage permissions across all modules. Each permission follows the{" "}
        <code
          style={{
            backgroundColor: colors.secondary[100],
            padding: "2px 6px",
            borderRadius: radius.scale.xs,
            fontSize: typography.sizes.small.fontSize,
          }}
        >
          module.action
        </code>{" "}
        pattern.
      </p>

      <div style={gridStyle}>
        {modules.map((mod) => (
          <div key={mod.module} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>{mod.label}</h3>
            </div>
            <div style={cardBodyStyle}>
              {mod.permissions.map((action) => (
                <span
                  key={`${mod.module}.${action}`}
                  style={badgeStyle("active")}
                >
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    style={checkboxStyle}
                  />
                  {actionLabels[action] ?? action}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
