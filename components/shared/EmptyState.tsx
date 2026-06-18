"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  action?: EmptyStateAction;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 24px",
  textAlign: "center",
};

const iconWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "72px",
  height: "72px",
  borderRadius: "50%",
  backgroundColor: colors.primary[50],
  color: colors.primary[300],
  fontSize: "36px",
  marginBottom: "16px",
};

const titleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h5.fontSize,
  lineHeight: typography.sizes.h5.lineHeight,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "8px",
};

const messageStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  lineHeight: typography.sizes.small.lineHeight,
  color: colors.text.muted,
  margin: 0,
  maxWidth: "360px",
};

const buttonStyle: React.CSSProperties = {
  marginTop: "20px",
  padding: "8px 20px",
  border: "none",
  borderRadius: "8px",
  backgroundColor: colors.primary[600],
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
  transition: "background-color 0.15s",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function EmptyState({
  icon,
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div style={containerStyle}>
      {icon && <div style={iconWrapperStyle}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      {message && <p style={messageStyle}>{message}</p>}
      {action && (
        <button
          style={buttonStyle}
          onClick={action.onClick}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              colors.primary[700];
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              colors.primary[600];
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
