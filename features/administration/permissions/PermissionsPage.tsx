"use client";

import React from "react";
import { PageHeader, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Shield, CheckCircle } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface PermissionInfo {
  code: string;
  action: string;
  description: string;
}

interface ModulePermissions {
  module: string;
  label: string;
  permissions: PermissionInfo[];
}

export interface PermissionsPageProps {
  groups?: ModulePermissions[];
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
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
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
};

const cardBodyStyle: React.CSSProperties = {
  padding: "12px 20px",
};

const permRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 0",
  borderBottom: `1px solid ${colors.border}`,
};

const permCodeStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.primary[700],
  backgroundColor: colors.primary[50],
  padding: "2px 8px",
  borderRadius: "4px",
  minWidth: "80px",
  textAlign: "center",
};

const permActionStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  minWidth: "60px",
};

const permDescStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  color: colors.text.secondary,
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function PermissionsPage({ groups = [] }: PermissionsPageProps) {
  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Permissions" },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Permissions"
        subtitle="View all system permissions grouped by module."
        breadcrumbs={breadcrumbs}
      />

      <div style={gridStyle}>
        {groups.map((mod) => (
          <div key={mod.module} style={cardStyle}>
            <div style={cardHeaderStyle}>
              <h3 style={cardTitleStyle}>{mod.label}</h3>
              <span
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.text.muted,
                }}
              >
                {mod.permissions.length} permissions
              </span>
            </div>
            <div style={cardBodyStyle}>
              {mod.permissions.map((perm) => (
                <div key={perm.code} style={permRowStyle}>
                  <CheckCircle size={14} color={colors.success[500]} />
                  <span style={permCodeStyle}>{perm.code}</span>
                  <span style={permActionStyle}>{perm.action}</span>
                  <span style={permDescStyle}>{perm.description}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
