"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface FormCardFooter {
  actions?: React.ReactNode;
}

export interface FormCardProps {
  title?: string;
  icon?: React.ReactNode;
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
};

const tealHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 24px",
  background: `linear-gradient(135deg, ${colors.primary[600]} 0%, ${colors.primary[800]} 100%)`,
  color: colors.text.inverse,
};

const defaultHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "14px 24px",
  borderBottom: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
};

const headerIconStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "18px",
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
  children,
  footer,
  variant = "default",
}: FormCardProps) {
  const isTeal = variant === "teal-header";

  return (
    <div style={cardStyle}>
      {(title || icon) && (
        <div style={isTeal ? tealHeaderStyle : defaultHeaderStyle}>
          {icon && (
            <span
              style={{
                ...headerIconStyle,
                color: isTeal ? colors.text.inverse : colors.primary[600],
              }}
            >
              {icon}
            </span>
          )}
          <h5
            style={{
              ...headerTitleStyle,
              color: isTeal ? colors.text.inverse : colors.text.primary,
            }}
          >
            {title}
          </h5>
        </div>
      )}
      <div style={bodyStyle}>{children}</div>
      {footer?.actions && <div style={footerStyle}>{footer.actions}</div>}
    </div>
  );
}
