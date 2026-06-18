"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
  title: string;
  recordInfo?: string;
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
  marginBottom: "4px",
};

const recordInfoStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  lineHeight: typography.sizes.body.lineHeight,
  color: colors.text.secondary,
  margin: 0,
  marginBottom: "16px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
  display: "block",
  marginBottom: "6px",
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  backgroundColor: colors.surface,
  outline: "none",
  resize: "vertical",
  minHeight: "80px",
  boxSizing: "border-box",
  lineHeight: "20px",
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

const rejectButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  border: "none",
  borderRadius: radius.components.button,
  backgroundColor: colors.danger[600],
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
};

const approveButtonStyle: React.CSSProperties = {
  padding: "8px 18px",
  border: "none",
  borderRadius: radius.components.button,
  backgroundColor: colors.success[600],
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ApprovalDialog({
  open,
  onClose,
  onApprove,
  onReject,
  title,
  recordInfo,
  loading,
}: ApprovalDialogProps) {
  const [comment, setComment] = React.useState("");

  if (!open) return null;

  const handleApprove = () => {
    onApprove(comment);
    setComment("");
  };

  const handleReject = () => {
    onReject(comment);
    setComment("");
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={bodyStyle}>
          <h3 style={titleStyle}>{title}</h3>
          {recordInfo && <p style={recordInfoStyle}>{recordInfo}</p>}
          <label style={labelStyle}>Comment (optional)</label>
          <textarea
            style={textareaStyle}
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={loading}
          />
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
            style={rejectButtonStyle}
            onClick={handleReject}
            disabled={loading}
          >
            {loading ? "Processing..." : "Reject"}
          </button>
          <button
            style={approveButtonStyle}
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? "Processing..." : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}
