"use client";

import React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { useAccess } from "@/lib/auth/use-access";

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
  onClick?: () => void;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  permission?: string | string[];
  href?: string;
}

export interface ActionButtonsProps {
  actions: Action[];
}

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
  const filled = variant !== "secondary";
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    width: "fit-content",
    maxWidth: "100%",
    height: 42,
    minHeight: 42,
    gap: "8px",
    padding: "0 16px",
    border: filled ? "1px solid transparent" : "1px solid #94a3b8",
    borderRadius: radius.components.button,
    backgroundColor: vs.bg,
    color: vs.color,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.55 : 1,
    whiteSpace: "nowrap",
    lineHeight: "20px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
    boxSizing: "border-box",
  };
}

export default function ActionButtons({ actions }: ActionButtonsProps) {
  const { ready, pathname, visibleActions } = useAccess();
  const showWhileSessionLoads = !ready && pathname.includes("/create");
  const allowed = showWhileSessionLoads ? actions : visibleActions(actions);
  if (allowed.length === 0) return null;

  const busy = allowed.some((action) => action.loading);

  return (
    <div className="erp-action-buttons">
      {allowed.map((action, index) => {
        const showSpinner = Boolean(action.loading);
        const disabled = Boolean(action.disabled || busy);
        const content = showSpinner ? (
          <>
            <Loader2 size={16} className="erp-btn-spinner" aria-hidden />
            <span>{action.loadingLabel ?? "Saving..."}</span>
          </>
        ) : (
          <>
            {action.icon}
            {action.label}
          </>
        );

        if (action.href) {
          return (
            <Link
              key={`${action.label}-${index}`}
              href={action.href}
              style={{
                ...getButtonStyle(action.variant ?? "secondary", disabled),
                textDecoration: "none",
                pointerEvents: disabled ? "none" : "auto",
              }}
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={`${action.label}-${index}`}
            type="button"
            style={getButtonStyle(action.variant ?? "secondary", disabled)}
            onClick={action.onClick}
            disabled={disabled}
            aria-busy={showSpinner}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
