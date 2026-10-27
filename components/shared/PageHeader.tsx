"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { RecordDetailIcon } from "./RecordDetailIcon";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  recordKind?: string;
  leadingAction?: React.ReactNode;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: `${spacing.card.padding}px`,
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
};

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "10px",
  minWidth: 0,
};

const titleLeftStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minWidth: 0,
  flex: 1,
};

const iconWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "32px",
  height: "32px",
  borderRadius: radius.scale.sm,
  backgroundColor: colors.primary[50],
  color: colors.primary[600],
  fontSize: "18px",
};

const titleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h5.fontSize,
  lineHeight: typography.sizes.h5.lineHeight,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  lineHeight: typography.sizes.small.lineHeight,
  color: colors.text.secondary,
  margin: 0,
};

const breadcrumbContainerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
};

const breadcrumbTextStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  lineHeight: typography.sizes.caption.lineHeight,
  color: colors.text.muted,
};

const breadcrumbLinkStyle: React.CSSProperties = {
  ...breadcrumbTextStyle,
  color: colors.primary[600],
  textDecoration: "none",
  cursor: "pointer",
};

const breadcrumbSeparatorStyle: React.CSSProperties = {
  ...breadcrumbTextStyle,
  color: colors.text.muted,
};

const actionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  flexWrap: "wrap",
  marginLeft: "auto",
  flexShrink: 0,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function PageHeader({
  title,
  subtitle,
  icon,
  recordKind,
  leadingAction,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  const router = useRouter();
  const resolvedIcon = icon
    ? <span style={iconWrapperStyle}>{icon}</span>
    : recordKind
      ? <RecordDetailIcon kind={recordKind} />
      : null;
  return (
    <div className="erp-page-header" style={containerStyle}>
      <div style={titleRowStyle}>
        <div style={titleLeftStyle}>
          {leadingAction}
          {resolvedIcon}
          <h1 style={titleStyle}>{title}</h1>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 42,
            padding: "0 16px",
            borderRadius: 8,
            border: "1px solid #94a3b8",
            backgroundColor: "#ffffff",
            color: colors.text.primary,
            fontFamily: typography.fontFamily,
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
            whiteSpace: "nowrap",
            flexShrink: 0,
            boxSizing: "border-box",
          }}
        >
          Back
        </button>
      </div>
      {subtitle ? <p style={{ ...subtitleStyle, marginLeft: resolvedIcon ? 42 : 0 }}>{subtitle}</p> : null}
      {actions ? (
        <div style={{ ...actionsStyle, marginTop: 8 }}>{actions}</div>
      ) : null}
    </div>
  );
}
