"use client";

import type { CSSProperties } from "react";

import { colors } from "@/components/ui/colors";

export const lineRowRemoveButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  minWidth: 28,
  maxWidth: 28,
  height: 28,
  padding: 0,
  borderRadius: 6,
  border: `1px solid ${colors.danger[200]}`,
  backgroundColor: colors.danger[50],
  color: colors.danger[700],
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
};

const cellStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

type RemarksWithRemoveCellProps = {
  value: string;
  onChange: (value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
  canRemove?: boolean;
  placeholder?: string;
  inputStyle?: CSSProperties;
  removeAriaLabel: string;
};

export function RemarksWithRemoveCell({
  onRemove,
  disabled = false,
  canRemove = true,
  removeAriaLabel,
}: RemarksWithRemoveCellProps) {
  const removeDisabled = disabled || !canRemove;

  return (
    <div style={{ ...cellStyle, justifyContent: "center" }}>
      <button
        type="button"
        className="erp-remove-row-btn"
        disabled={removeDisabled}
        style={{
          ...lineRowRemoveButtonStyle,
          opacity: removeDisabled ? 0.45 : 1,
          cursor: removeDisabled ? "not-allowed" : "pointer",
        }}
        onClick={onRemove}
        aria-label={removeAriaLabel}
      >
        X
      </button>
    </div>
  );
}
