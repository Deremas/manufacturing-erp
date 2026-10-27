"use client";

import React from "react";

import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";

export function QCWideTable({
  minWidth,
  children,
  hint = "Scroll to see more →",
  maxHeight = "min(520px, 60vh)",
}: {
  minWidth: number;
  children: React.ReactNode;
  hint?: string;
  maxHeight?: string | number | null;
}) {
  return (
    <div style={{ minWidth: 0, maxWidth: "100%", width: "100%" }}>
      {hint ? <p style={{ margin: "0 0 8px", fontSize: 12, color: colors.text.muted }}>{hint}</p> : null}
      <div
        className="qc-wide-table-scroll"
        style={{
          overflowX: "auto",
          overflowY: maxHeight ? "auto" : "hidden",
          maxWidth: "100%",
          maxHeight: maxHeight ?? undefined,
          width: "100%",
          minWidth: 0,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.components.card,
          WebkitOverflowScrolling: "touch",
        }}
      >
        <div style={{ minWidth, width: minWidth }}>{children}</div>
      </div>
    </div>
  );
}

export const qcTableStyle: React.CSSProperties = {
  width: "max-content",
  minWidth: "100%",
  borderCollapse: "collapse",
  background: "white",
};

export const qcThStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "6px 8px",
  background: "#f8fafc",
  fontSize: 11,
  fontWeight: 500,
  color: colors.text.secondary,
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: "nowrap",
  verticalAlign: "bottom",
};

export const qcTdStyle: React.CSSProperties = {
  padding: "4px 8px",
  borderBottom: `1px solid ${colors.border}`,
  fontSize: 12,
  verticalAlign: "middle",
};

export const qcInputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 96,
  height: 32,
  minHeight: 32,
  padding: "4px 8px",
  border: "1px solid #94a3b8",
  borderRadius: 6,
  fontSize: 12,
  lineHeight: "20px",
  boxSizing: "border-box",
  background: "white",
};

export const qcPageTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  lineHeight: "22px",
  color: colors.text.primary,
};

export const qcFieldLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#334155",
  letterSpacing: 0.1,
};

export function QCField({
  label,
  children,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`qc-field ${className ?? ""}`.trim()} style={{ display: "grid", gap: 4, minWidth: 0 }}>
      <span className="qc-field-label" style={qcFieldLabelStyle}>
        {label}
        {required ? <span style={{ color: colors.danger[600] }}> *</span> : ""}
      </span>
      {children}
    </div>
  );
}

export const qcToolbarButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  border: "none",
  borderRadius: 6,
  background: "#334155",
  color: "white",
  fontWeight: 600,
  fontSize: 12,
  cursor: "pointer",
};
