"use client";

import React, { useState, useEffect } from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import { priceListSchema } from "@/validators/master-data";
import type { PriceListInput } from "@/validators/master-data";
import type { PriceList, Item } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface PriceListFormProps {
  initialData?: PriceList;
  items?: Item[];
  onSubmit: (data: PriceListInput) => Promise<void>;
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
// Mock items (replace with real data)
// ----------------------------------------------------------------------------
const defaultItems: Item[] = [];

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function PriceListForm({
  initialData,
  items = defaultItems,
  onSubmit,
  loading,
}: PriceListFormProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<PriceListInput>({
    itemId: "",
    customerGroup: "",
    price: 0,
    effectiveDate: "",
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        itemId: initialData.itemId,
        customerGroup: initialData.customerGroup ?? "",
        price: initialData.price,
        effectiveDate: initialData.effectiveDate ?? "",
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

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = priceListSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    await onSubmit(parsed.data);
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
      label: isEdit ? "Update Price List" : "Save Price List",
      variant: "primary",
      onClick: handleSubmit as unknown as () => void,
      loading,
    },
  ];

  const renderField = (
    name: string,
    label: string,
    type: "text" | "select" | "number" = "text",
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
            type={type === "number" ? "number" : type}
            style={{
              ...inputStyle,
              borderColor: hasError ? colors.danger[500] : colors.border,
            }}
            value={String(fieldValue ?? "")}
            onChange={type === "number" ? handleNumberChange : handleChange}
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

  const itemOptions = items.map((item) => ({
    label: `${item.itemCode} - ${item.itemName}`,
    value: item.id,
  }));

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Price List Information"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={footerActions} /> }}
      >
        <div style={gridStyle}>
          {renderField("itemId", "Item", "select", itemOptions)}
          {renderField(
            "customerGroup",
            "Customer Group",
            "text",
            undefined,
            "e.g. Retail",
          )}
          {renderField("price", "Price", "number")}
          {renderField(
            "effectiveDate",
            "Effective Date",
            "text",
            undefined,
            "e.g. 2026-01-01",
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
