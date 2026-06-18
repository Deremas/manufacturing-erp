"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export type FilterFieldType = "text" | "select" | "date" | "dateRange";

export interface FilterField {
  type: FilterFieldType;
  key: string;
  label: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface FilterCardProps {
  title?: string;
  fields: FilterField[];
  onFilter: (values: Record<string, string>) => void;
  onReset: () => void;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
  padding: `${spacing.card.padding}px`,
};

const titleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  lineHeight: typography.sizes.body.lineHeight,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "14px",
};

const fieldsContainerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
  alignItems: "flex-end",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: "160px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: "20px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingTop: "4px",
};

const filterButtonStyle: React.CSSProperties = {
  padding: "7px 18px",
  border: "none",
  borderRadius: radius.components.button,
  backgroundColor: colors.primary[600],
  color: colors.text.inverse,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const resetButtonStyle: React.CSSProperties = {
  padding: "7px 18px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.button,
  backgroundColor: colors.surface,
  color: colors.text.secondary,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
  whiteSpace: "nowrap",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function FilterCard({
  title,
  fields,
  onFilter,
  onReset,
  loading,
}: FilterCardProps) {
  const [values, setValues] = React.useState<Record<string, string>>({});

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilter = () => {
    onFilter(values);
  };

  const handleReset = () => {
    setValues({});
    onReset();
  };

  return (
    <div style={cardStyle}>
      {title && <h4 style={titleStyle}>{title}</h4>}
      <div style={fieldsContainerStyle}>
        {fields.map((field) => (
          <div key={field.key} style={fieldGroupStyle}>
            <label style={labelStyle}>{field.label}</label>
            {field.type === "select" ? (
              <select
                style={selectStyle}
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              >
                <option value="">
                  {field.placeholder ?? `All ${field.label}`}
                </option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                style={inputStyle}
                type={
                  field.type === "date"
                    ? "date"
                    : field.type === "dateRange"
                      ? "date"
                      : "text"
                }
                placeholder={
                  field.placeholder ?? `Enter ${field.label.toLowerCase()}...`
                }
                value={values[field.key] ?? ""}
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
        <div style={buttonRowStyle}>
          <button
            style={filterButtonStyle}
            onClick={handleFilter}
            disabled={loading}
          >
            {loading ? "Filtering..." : "Filter"}
          </button>
          <button style={resetButtonStyle} onClick={handleReset}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
