"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

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
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: `${spacing.card.gap}px`,
  padding: `${spacing.card.padding}px`,
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
};

const leftSectionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const titleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
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
  marginLeft: "42px",
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
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function PageHeader({
  title,
  subtitle,
  icon,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <div style={containerStyle}>
      <div style={leftSectionStyle}>
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div style={breadcrumbContainerStyle}>
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <React.Fragment key={crumb.label + index}>
                  {index > 0 && <span style={breadcrumbSeparatorStyle}>/</span>}
                  {crumb.href && !isLast ? (
                    <a href={crumb.href} style={breadcrumbLinkStyle}>
                      {crumb.label}
                    </a>
                  ) : (
                    <span
                      style={{
                        ...breadcrumbTextStyle,
                        color: isLast
                          ? colors.text.secondary
                          : breadcrumbTextStyle.color,
                      }}
                    >
                      {crumb.label}
                    </span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}

        {/* Title row */}
        <div style={titleRowStyle}>
          {icon && <span style={iconWrapperStyle}>{icon}</span>}
          <h1 style={titleStyle}>{title}</h1>
        </div>

        {/* Subtitle */}
        {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
      </div>

      {/* Actions */}
      {actions && <div style={actionsStyle}>{actions}</div>}
    </div>
  );
}
