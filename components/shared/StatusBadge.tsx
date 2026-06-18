"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { badges, type BadgeVariant } from "@/components/ui/badges";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type BadgeSize = "sm" | "md" | "lg";

export interface StatusBadgeProps {
  status: BadgeVariant;
  size?: BadgeSize;
}

// ----------------------------------------------------------------------------
// Size mapping
// ----------------------------------------------------------------------------
const sizeConfig: Record<BadgeSize, { fontSize: string; padding: string }> = {
  sm: { fontSize: typography.sizes.caption.fontSize, padding: "2px 8px" },
  md: { fontSize: typography.sizes.small.fontSize, padding: "4px 10px" },
  lg: { fontSize: typography.sizes.body.fontSize, padding: "6px 14px" },
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const config = badges[status];
  const sizeStyles = sizeConfig[size];

  if (!config) {
    // Fallback for unknown status
    return (
      <span
        style={{
          fontFamily: typography.fontFamily,
          fontSize: sizeStyles.fontSize,
          fontWeight: typography.weights.medium,
          padding: sizeStyles.padding,
          borderRadius: radius.components.badge,
          backgroundColor: colors.secondary[100],
          color: colors.text.secondary,
          border: `1px solid ${colors.border}`,
          display: "inline-block",
          lineHeight: 1.4,
          whiteSpace: "nowrap",
        }}
      >
        {status}
      </span>
    );
  }

  return (
    <span
      style={{
        fontFamily: typography.fontFamily,
        fontSize: sizeStyles.fontSize,
        fontWeight: typography.weights.medium,
        padding: sizeStyles.padding,
        borderRadius: radius.components.badge,
        backgroundColor: config.bg,
        color: config.text,
        border: `1px solid ${config.border}`,
        display: "inline-block",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
      }}
    >
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}
