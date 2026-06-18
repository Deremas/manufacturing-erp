"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface RecordBadgeProps {
  type: string;
  id: string;
  status?: string;
}

// ----------------------------------------------------------------------------
// Style helpers
// ----------------------------------------------------------------------------
const statusColors: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  active: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  inactive: {
    bg: colors.secondary[50],
    text: colors.secondary[600],
    border: colors.secondary[200],
  },
  pending: {
    bg: colors.warning[50],
    text: colors.warning[700],
    border: colors.warning[200],
  },
  approved: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  rejected: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  posted: {
    bg: colors.success[50],
    text: colors.success[700],
    border: colors.success[200],
  },
  voided: {
    bg: colors.danger[50],
    text: colors.danger[700],
    border: colors.danger[200],
  },
  draft: {
    bg: colors.secondary[50],
    text: colors.secondary[600],
    border: colors.secondary[200],
  },
  completed: {
    bg: colors.info[50],
    text: colors.info[700],
    border: colors.info[200],
  },
};

const typeColors: Record<string, string> = {
  PO: colors.primary[600],
  GRN: colors.success[600],
  INV: colors.warning[600],
  SO: colors.info[600],
  WO: colors.secondary[600],
  PR: colors.danger[600],
  QN: colors.primary[500],
};

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  padding: "3px 10px",
  borderRadius: radius.components.badge,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  whiteSpace: "nowrap",
  lineHeight: "18px",
};

const typePartStyle = (type: string): React.CSSProperties => ({
  color: typeColors[type] ?? colors.primary[600],
  fontWeight: typography.weights.semibold,
});

const idPartStyle: React.CSSProperties = {
  color: colors.text.primary,
  fontWeight: typography.weights.regular,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function RecordBadge({ type, id, status }: RecordBadgeProps) {
  const statusColor = status ? statusColors[status.toLowerCase()] : undefined;

  return (
    <span
      style={{
        ...badgeStyle,
        backgroundColor: statusColor?.bg ?? colors.secondary[50],
        border: `1px solid ${statusColor?.border ?? colors.border}`,
      }}
    >
      <span style={typePartStyle(type)}>{type}</span>
      <span style={idPartStyle}>- {id}</span>
    </span>
  );
}
