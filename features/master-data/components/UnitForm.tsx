"use client";

import React, { useState, useEffect } from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import { unitSchema } from "@/validators/master-data";
import type { UnitInput } from "@/validators/master-data";
import type { Unit } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface UnitFormProps {
  initialData?: Unit;
  onSubmit: (data: UnitInput) => Promise<void>;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
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
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: "6px",
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

const errorTextStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  color: colors.danger[600],
  marginTop: "2px",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingTop: "4px",
};

const toggleLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
};

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  cursor: "pointer",
  accentColor: colors.primary[600],
};

const unitTypeOptions = [
  "Weight",
  "Volume",
  "Length",
  "Quantity",
  "Area",
  "Time",
];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function UnitForm({
  initialData,
  onSubmit,
  loading,
}: UnitFormProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<UnitInput>({
    code: "",
    name: "",
    abbreviation: "",
    type: "",
    decimalPrecision: 0,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (initialData) {
      setForm({
        code: initialData.code ?? "",
        name: initialData.name,
        abbreviation: initialData.abbreviation,
        type: initialData.type ?? "",
        decimalPrecision: initialData.decimalPrecision ?? 0,
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    let nextValue: string | boolean = checked !== undefined ? checked : value;

    if (checked === undefined && (name === "code" || name === "abbreviation")) {
      nextValue = String(value).toUpperCase();
    }

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
    setFormError("");

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError("");

    const parsed = unitSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      await onSubmit(parsed.data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save unit";

      if (/unit code .* already exists/i.test(message)) {
        setErrors((prev) => ({
          ...prev,
          code: [message],
        }));
        return;
      }

      setFormError(message);
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      onClick: handleCancel,
      disabled: loading,
    },
    {
      label: isEdit ? "Update Unit" : "Save Unit",
      variant: "primary",
      onClick: handleSubmit as unknown as () => void,
      loading,
    },
  ];

  const renderField = (
    name: string,
    label: string,
    type: "text" | "select" = "text",
    options?: { label: string; value: string }[],
    placeholder?: string,
  ) => {
    const hasError = !!errors[name];
    const fieldValue = (form as Record<string, unknown>)[name];

    return (
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{label}</label>
        {type === "select" && options ? (
          <select
            name={name}
            style={selectStyle}
            value={String(fieldValue ?? "")}
            onChange={handleChange}
          >
            <option value="">{placeholder ?? "Select ..."}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            name={name}
            type={type}
            style={{
              ...inputStyle,
              borderColor: hasError ? colors.danger[500] : colors.border,
            }}
            value={String(fieldValue ?? "")}
            onChange={handleChange}
            autoCapitalize={name === "code" || name === "abbreviation" ? "characters" : undefined}
            placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
          />
        )}
        {hasError &&
          errors[name]?.map((err, i) => (
            <span key={i} style={errorTextStyle}>
              {err}
            </span>
          ))}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Unit Information"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={footerActions} /> }}
      >
        <div style={gridStyle}>
          {renderField("code", "Code", "text", undefined, "e.g. KG")}
          {renderField("name", "Unit Name", "text", undefined, "e.g. Kilogram")}
          {renderField(
            "abbreviation",
            "Abbreviation",
            "text",
            undefined,
            "e.g. kg",
          )}
        </div>
        <div style={{ marginTop: "16px" }}>
          <div style={gridStyle}>
            {renderField(
              "type",
              "Unit Type",
              "select",
              unitTypeOptions.map((t) => ({ label: t, value: t })),
            )}
            {renderField(
              "decimalPrecision",
              "Decimal Precision",
              "text",
              undefined,
              "e.g. 0",
            )}
          </div>
        </div>
        <div style={{ marginTop: "16px" }}>
          <div style={toggleRowStyle}>
            <input
              name="isActive"
              type="checkbox"
              style={checkboxStyle}
              checked={form.isActive}
              onChange={handleChange}
            />
            <span style={toggleLabelStyle}>Active</span>
          </div>
        </div>
        {formError ? (
          <div style={{ ...errorTextStyle, marginTop: "12px" }}>{formError}</div>
        ) : null}
      </FormCard>
    </form>
  );
}
