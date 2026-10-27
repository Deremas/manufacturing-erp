import type { CSSProperties } from "react";

import { colors } from "@/components/ui/colors";

export function decoratedDropdownOptionStyle(isSelected: boolean, isActive: boolean): CSSProperties {
  if (isSelected) {
    return {
      background: colors.primary[600],
      color: colors.text.inverse,
      fontWeight: 700,
      boxShadow: `inset 4px 0 0 ${colors.primary[800]}`,
    };
  }
  if (isActive) {
    return {
      background: colors.primary[100],
      color: colors.primary[900],
      fontWeight: 600,
      boxShadow: `inset 4px 0 0 ${colors.primary[600]}`,
    };
  }
  return {
    background: "white",
    color: colors.text.primary,
    fontWeight: 500,
    boxShadow: "none",
  };
}

export const decoratedDropdownListStyle: CSSProperties = {
  zIndex: 1200,
  background: "white",
  border: `1px solid ${colors.primary[200]}`,
  borderRadius: 8,
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.18)",
  maxHeight: 240,
  overflowY: "auto",
};
