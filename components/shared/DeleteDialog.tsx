"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface DeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  recordName?: string;
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
  textAlign: "center",
};

const iconWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "56px",
  height: "56px",
  borderRadius: "50%",
  backgroundColor: colors.danger[50],
  color: colors.danger[500],
  fontSize: "28px",
  margin: "0 auto 16px",
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

const recordNameStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  lineHeight: typography.sizes.body.lineHeight,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: "4px 0 0",
};

const footerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
  padding: "14px 24px",
  borderTop: `1px solid ${colors.border}`,
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
  flex: 1,
};

const deleteButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  border: "none",
  borderRadius: radius.components.button,
  backgroundColor: colors.danger[600],
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
  flex: 1,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function DeleteDialog({
  open,
  onClose,
  onConfirm,
  title = "Delete Record",
  message = "Are you sure you want to delete this record? This action cannot be undone.",
  recordName,
  loading,
}: DeleteDialogProps) {
  if (!open) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={bodyStyle}>
          <div style={iconWrapperStyle}>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
          <h3 style={titleStyle}>{title}</h3>
          <p style={messageStyle}>{message}</p>
          {recordName && <p style={recordNameStyle}>"{recordName}"</p>}
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
            style={deleteButtonStyle}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
