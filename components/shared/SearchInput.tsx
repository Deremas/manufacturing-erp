"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onClear?: () => void;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const wrapperStyle: React.CSSProperties = {
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  width: "100%",
  maxWidth: "320px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px 8px 36px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  lineHeight: "20px",
  transition: "border-color 0.15s",
};

const searchIconStyle: React.CSSProperties = {
  position: "absolute",
  left: "10px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: colors.text.muted,
  fontSize: "16px",
  pointerEvents: "none",
};

const clearButtonStyle: React.CSSProperties = {
  position: "absolute",
  right: "8px",
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  border: "none",
  borderRadius: "50%",
  backgroundColor: colors.secondary[200],
  color: colors.text.secondary,
  cursor: "pointer",
  fontSize: "12px",
  lineHeight: 1,
  padding: 0,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  onClear,
}: SearchInputProps) {
  const handleClear = () => {
    onChange("");
    onClear?.();
  };

  return (
    <div style={wrapperStyle}>
      <span style={searchIconStyle}>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </span>
      <input
        style={inputStyle}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor =
            colors.primary[500];
        }}
        onBlur={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = colors.border;
        }}
      />
      {value && value.length > 0 && (
        <button style={clearButtonStyle} onClick={handleClear} type="button">
          \u2715
        </button>
      )}
    </div>
  );
}
