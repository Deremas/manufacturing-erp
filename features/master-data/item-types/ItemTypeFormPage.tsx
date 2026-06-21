"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { itemTypeSchema } from "@/validators/master-data";
import type { ItemTypeInput } from "@/validators/master-data";
import type { ItemType } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ItemTypeFormPageProps {
  initialData?: ItemType;
  onSubmit?: (data: ItemTypeInput) => Promise<void>;
  loading?: boolean;
  isEdit?: boolean;
  onBack?: () => void;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle2: React.CSSProperties = {
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
  height: "48px",
  padding: "7px 10px",
  border: `1px solid ${colors.border}`,
  borderRadius: "10px",
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: "20px",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "auto",
  minHeight: "80px",
  resize: "vertical",
  lineHeight: "1.5",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingTop: "14px",
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

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "16px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${colors.border}`,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "24px",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ItemTypeFormPage({
  initialData,
  onSubmit,
  loading,
  isEdit: editMode,
  onBack,
}: ItemTypeFormPageProps) {
  const isEdit = editMode ?? !!initialData;

  const [form, setForm] = useState<ItemTypeInput>({
    name: "",
    code: "",
    description: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name,
        code: initialData.code,
        description: initialData.description ?? "",
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
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

    const parsed = itemTypeSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    if (onSubmit) {
      await onSubmit(parsed.data);
    }
  };

  const handleCancel = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Item Types", href: "/master-data/item-types" },
    { label: isEdit ? "Edit" : "Create" },
  ];

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      onClick: handleCancel,
      disabled: loading,
    },
    {
      label: isEdit ? "Update Item Type" : "Save Item Type",
      variant: "primary",
      onClick: handleSubmit as unknown as () => void,
      loading,
    },
  ];

  const hasError = (name: string) => !!errors[name];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title={isEdit ? "Edit Item Type" : "Create Item Type"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard
        title="Item Type Information"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={footerActions} /> }}
      >
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Item Type Details</h4>
          <div style={gridStyle2}>
            {/* Name */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Name</label>
              <input
                name="name"
                type="text"
                style={inputStyle}
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Raw Material"
              />
              {hasError("name") && (
                <span
                  style={{
                    fontFamily: typography.fontFamily,
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.danger[600],
                    marginTop: "2px",
                  }}
                >
                  {errors.name?.join(", ")}
                </span>
              )}
            </div>

            {/* Code */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Code</label>
              <input
                name="code"
                type="text"
                style={inputStyle}
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. RAW"
              />
              {hasError("code") && (
                <span
                  style={{
                    fontFamily: typography.fontFamily,
                    fontSize: typography.sizes.caption.fontSize,
                    color: colors.danger[600],
                    marginTop: "2px",
                  }}
                >
                  {errors.code?.join(", ")}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Description</h4>
          <div style={fieldGroupStyle}>
            <textarea
              name="description"
              style={textareaStyle}
              value={form.description}
              onChange={handleChange}
              placeholder="Enter description (optional)"
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Status</h4>
          <div style={toggleRowStyle}>
            <input
              name="isActive"
              type="checkbox"
              style={checkboxStyle}
              checked={form.isActive}
              onChange={handleChange}
            />
            <span style={toggleLabelStyle}>
              {form.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
