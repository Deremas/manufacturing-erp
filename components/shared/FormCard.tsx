"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { sectionIconForTitle } from "./section-icon";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface FormCardFooter {
  actions?: React.ReactNode;
}

export interface FormCardProps {
  title?: string;
  icon?: React.ReactNode;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
  footer?: FormCardFooter;
  variant?: "default" | "teal-header";
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
  overflow: "hidden",
  minWidth: 0,
  maxWidth: "100%",
};

const tealHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 24px 18px",
  background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[800]} 100%)`,
  color: colors.text.inverse,
};

const defaultHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 24px 18px",
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
};

const headerIconStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 32,
  height: 32,
  borderRadius: 8,
  flexShrink: 0,
};

const headerTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h6.fontSize,
  lineHeight: typography.sizes.h6.lineHeight,
  fontWeight: typography.weights.semibold,
  margin: 0,
};

const bodyStyle: React.CSSProperties = {
  padding: "24px",
  minWidth: 0,
  maxWidth: "100%",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: "8px",
  padding: "14px 24px",
  borderTop: `1px solid ${colors.border}`,
  backgroundColor: "#f9fafb",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function FormCard({
  title,
  icon,
  headerExtra,
  children,
  footer,
  variant = "default",
}: FormCardProps) {
  const isTeal = variant === "teal-header";
  const resolvedIcon = icon ?? (title ? sectionIconForTitle(title) : undefined);

  return (
    <div style={cardStyle}>
      {(title || resolvedIcon || headerExtra) && (
        <div style={{
          ...(isTeal ? tealHeaderStyle : defaultHeaderStyle),
          justifyContent: "space-between",
        }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
            {resolvedIcon ? (
              <span
                aria-hidden="true"
                style={{
                  ...headerIconStyle,
                  backgroundColor: isTeal ? "rgba(255,255,255,0.16)" : colors.primary[50],
                  color: isTeal ? colors.text.inverse : colors.primary[700],
                }}
              >
                {resolvedIcon}
              </span>
            ) : null}
            {title ? (
              <h5
                style={{
                  ...headerTitleStyle,
                  color: isTeal ? colors.text.inverse : colors.primary[700],
                }}
              >
                {title}
              </h5>
            ) : null}
          </div>
          {headerExtra ? <div style={{ flexShrink: 0 }}>{headerExtra}</div> : null}
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
      {footer?.actions && <div style={footerStyle}>{footer.actions}</div>}
    </div>
  );
}
