"use client";

import React, { useState, useEffect } from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import { departmentSchema } from "@/validators/master-data";
import type { DepartmentInput } from "@/validators/master-data";
import type { Department } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface DepartmentFormProps {
  initialData?: Department;
  departments?: Department[];
  onSubmit?: (data: DepartmentInput) => Promise<void>;
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
  border: `1px solid ${colors.border}`,
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

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function DepartmentForm({
  initialData,
  departments = [],
  onSubmit,
  loading,
}: DepartmentFormProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<DepartmentInput>({
    name: "",
    code: "",
    managerId: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        code: initialData.code,
        managerId: initialData.managerId ?? "",
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

    setForm((prev) => ({
      ...prev,
      [name]: checked !== undefined ? checked : value,
    }));

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

    const parsed = departmentSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    if (onSubmit) {
      await onSubmit(parsed.data);
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
      label: isEdit ? "Update Department" : "Save Department",
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
            <option value="">{placeholder ?? `Select ${label}`}</option>
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

  const managerOptions = departments.map((d) => ({
    label: `${d.name} (${d.code})`,
    value: d.id,
  }));

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Department Information"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={footerActions} /> }}
      >
        <div style={gridStyle}>
          {renderField(
            "name",
            "Department Name",
            "text",
            undefined,
            "Enter department name",
          )}
          {renderField(
            "code",
            "Department Code",
            "text",
            undefined,
            "e.g. DEPT-001",
          )}
        </div>
        <div style={{ marginTop: "16px" }}>
          {renderField(
            "managerId",
            "Manager",
            "select",
            managerOptions,
            "Select manager",
          )}
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
      </FormCard>
    </form>
  );
}
