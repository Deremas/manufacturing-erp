"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type ConfirmColor = "danger" | "primary";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmColor?: ConfirmColor;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
  maxWidth: "450px",
  width: "90%",
  backgroundColor: colors.surface,
  borderRadius: radius.scale.lg,
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
  overflow: "hidden",
};

const bodyStyle: React.CSSProperties = {
  padding: "24px",
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
  fontSize: typography.sizes.body.fontSize,
  lineHeight: typography.sizes.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
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

const cancelButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.button,
  backgroundColor: colors.surface,
  color: colors.text.secondary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
};

const confirmButtonStyle = (color: ConfirmColor): React.CSSProperties => ({
  padding: "8px 18px",
  border: "none",
  borderRadius: radius.components.button,
  backgroundColor:
    color === "danger" ? colors.danger[600] : colors.primary[600],
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
});

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  confirmColor = "primary",
  loading,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={bodyStyle}>
          <h3 style={titleStyle}>{title}</h3>
          <p style={messageStyle}>{message}</p>
        </div>
        <div style={footerStyle}>
          <button
            style={cancelButtonStyle}
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            style={confirmButtonStyle(confirmColor)}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
