"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type ActionVariant =
  | "primary"
  | "secondary"
  | "danger"
  | "success"
  | "warning";

export interface Action {
  label: string;
  icon?: React.ReactNode;
  variant?: ActionVariant;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export interface ActionButtonsProps {
  actions: Action[];
}

// ----------------------------------------------------------------------------
// Variant style mapping
// ----------------------------------------------------------------------------
function getButtonStyle(
  variant: ActionVariant,
  disabled: boolean,
): React.CSSProperties {
  const variantStyles: Record<
    ActionVariant,
    { bg: string; color: string; border?: string }
  > = {
    primary: { bg: colors.primary[600], color: colors.text.inverse },
    secondary: {
      bg: colors.surface,
      color: colors.text.primary,
      border: colors.border,
    },
    danger: { bg: colors.danger[600], color: colors.text.inverse },
    success: { bg: colors.success[600], color: colors.text.inverse },
    warning: { bg: colors.warning[500], color: colors.text.inverse },
  };

  const vs = variantStyles[variant];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "7px 16px",
    border: vs.border ? `1px solid ${vs.border}` : "none",
    borderRadius: radius.components.button,
    backgroundColor: vs.bg,
    color: vs.color,
    fontFamily: typography.fontFamily,
    fontSize: typography.sizes.body.fontSize,
    fontWeight: typography.weights.medium,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    whiteSpace: "nowrap",
    lineHeight: "20px",
  };
}

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ActionButtons({ actions }: ActionButtonsProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      {actions.map((action, index) => (
        <button
          key={index}
          style={getButtonStyle(
            action.variant ?? "secondary",
            action.disabled ?? false,
          )}
          onClick={action.onClick}
          disabled={action.disabled || action.loading}
        >
          {action.loading ? (
            <span>Loading...</span>
          ) : (
            <>
              {action.icon}
              {action.label}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
