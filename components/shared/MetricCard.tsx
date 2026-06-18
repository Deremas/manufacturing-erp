"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type TrendDirection = "up" | "down";

export interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  borderColor?: string;
  subtitle?: string;
  trend?: TrendDirection;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const cardStyle = (borderColor?: string): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  padding: `${spacing.card.padding}px`,
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
  borderLeft: `4px solid ${borderColor ?? colors.primary[500]}`,
  position: "relative",
});

const headerRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  lineHeight: typography.sizes.small.lineHeight,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const valueRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: "8px",
};

const valueStyle = (color?: string): React.CSSProperties => ({
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h3.fontSize,
  lineHeight: typography.sizes.h3.lineHeight,
  fontWeight: typography.weights.bold,
  color: color ?? colors.text.primary,
  margin: 0,
});

const trendStyle = (direction: TrendDirection): React.CSSProperties => ({
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  lineHeight: typography.sizes.caption.lineHeight,
  fontWeight: typography.weights.semibold,
  color: direction === "up" ? colors.success[600] : colors.danger[600],
  display: "flex",
  alignItems: "center",
  gap: "2px",
});

const subtitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  lineHeight: typography.sizes.caption.lineHeight,
  color: colors.text.muted,
  margin: 0,
  marginTop: "2px",
};

const iconStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: radius.scale.sm,
  backgroundColor: colors.primary[50],
  color: colors.primary[600],
  fontSize: "18px",
  flexShrink: 0,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function MetricCard({
  label,
  value,
  icon,
  color,
  borderColor,
  subtitle,
  trend,
}: MetricCardProps) {
  return (
    <div style={cardStyle(borderColor)}>
      <div style={headerRowStyle}>
        <p style={labelStyle}>{label}</p>
        {icon && <div style={iconStyle}>{icon}</div>}
      </div>
      <div style={valueRowStyle}>
        <span style={valueStyle(color)}>{value}</span>
        {trend && (
          <span style={trendStyle(trend)}>
            {trend === "up" ? "\u2191" : "\u2193"}
          </span>
        )}
      </div>
      {subtitle && <p style={subtitleStyle}>{subtitle}</p>}
    </div>
  );
}
