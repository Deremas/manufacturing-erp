"use client";

import React, { useState, useEffect } from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import { itemSchema } from "@/validators/master-data";
import type { ItemInput } from "@/validators/master-data";
import type { Item } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ItemFormProps {
  initialData?: Item;
  onSubmit: (data: ItemInput) => Promise<void>;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
};

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

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "12px",
  paddingBottom: "6px",
  borderBottom: `1px solid ${colors.border}`,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "20px",
};

// ----------------------------------------------------------------------------
// Mock fetch helpers (replace with real API calls)
// ----------------------------------------------------------------------------
const mockCategories = [
  { id: "cat-1", name: "Raw Materials" },
  { id: "cat-2", name: "Electrical Components" },
  { id: "cat-3", name: "Machinery Parts" },
  { id: "cat-4", name: "Packaging Materials" },
  { id: "cat-5", name: "Consumables" },
];

const mockUnits = [
  { id: "uom-1", name: "Kilogram", abbreviation: "kg" },
  { id: "uom-2", name: "Gram", abbreviation: "g" },
  { id: "uom-3", name: "Roll", abbreviation: "rl" },
  { id: "uom-4", name: "Meter", abbreviation: "m" },
  { id: "uom-5", name: "Unit", abbreviation: "unit" },
  { id: "uom-6", name: "Liter", abbreviation: "L" },
];

const itemTypeOptions = [
  "Raw Material",
  "Component",
  "Finished Good",
  "Service",
  "Supply",
];

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  cursor: "pointer",
  accentColor: colors.primary[600],
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ItemForm({
  initialData,
  onSubmit,
  loading,
}: ItemFormProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<ItemInput>({
    itemCode: "",
    itemName: "",
    sku: "",
    categoryId: "",
    itemType: "",
    uomId: "",
    purchaseUomId: "",
    salesUomId: "",
    conversionFactor: 1,
    reorderPoint: 0,
    standardCost: 0,
    sellingPrice: 0,
    vatApplicable: true,
    exciseApplicable: false,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        itemCode: initialData.itemCode,
        itemName: initialData.itemName,
        sku: initialData.sku ?? "",
        categoryId: initialData.categoryId ?? "",
        itemType: initialData.itemType ?? "",
        uomId: initialData.uomId ?? "",
        purchaseUomId: initialData.purchaseUomId ?? "",
        salesUomId: initialData.salesUomId ?? "",
        conversionFactor: initialData.conversionFactor ?? 1,
        reorderPoint: initialData.reorderPoint ?? 0,
        standardCost: initialData.standardCost ?? 0,
        sellingPrice: initialData.sellingPrice ?? 0,
        vatApplicable: initialData.vatApplicable ?? true,
        exciseApplicable: initialData.exciseApplicable ?? false,
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

    // Clear field error on change
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

    const parsed = itemSchema.safeParse(form);
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
      label: isEdit ? "Update Item" : "Save Item",
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
            type={type}
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

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Item Information"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={footerActions} /> }}
      >
        {/* Basic Info */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Basic Information</h4>
          <div style={gridStyle}>
            {renderField(
              "itemCode",
              "Item Code",
              "text",
              undefined,
              "e.g. ITM-001",
            )}
            {renderField(
              "itemName",
              "Item Name",
              "text",
              undefined,
              "Enter item name",
            )}
            {renderField("sku", "SKU", "text", undefined, "Stock keeping unit")}
            {renderField(
              "categoryId",
              "Category",
              "select",
              mockCategories.map((c) => ({ label: c.name, value: c.id })),
            )}
            {renderField(
              "itemType",
              "Item Type",
              "select",
              itemTypeOptions.map((t) => ({ label: t, value: t })),
            )}
          </div>
        </div>

        {/* UOM */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Units of Measure</h4>
          <div style={gridStyle}>
            {renderField(
              "uomId",
              "UOM",
              "select",
              mockUnits.map((u) => ({
                label: `${u.name} (${u.abbreviation})`,
                value: u.id,
              })),
            )}
            {renderField(
              "purchaseUomId",
              "Purchase UOM",
              "select",
              mockUnits.map((u) => ({
                label: `${u.name} (${u.abbreviation})`,
                value: u.id,
              })),
              "Select purchase UOM",
            )}
            {renderField(
              "salesUomId",
              "Sales UOM",
              "select",
              mockUnits.map((u) => ({
                label: `${u.name} (${u.abbreviation})`,
                value: u.id,
              })),
              "Select sales UOM",
            )}
            {renderField("conversionFactor", "Conversion Factor", "number")}
          </div>
        </div>

        {/* Pricing */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Pricing & Inventory</h4>
          <div style={gridStyle}>
            {renderField("reorderPoint", "Reorder Point", "number")}
            {renderField("standardCost", "Standard Cost", "number")}
            {renderField("sellingPrice", "Selling Price", "number")}
          </div>
        </div>

        {/* Settings */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Status & Settings</h4>
          <div style={gridStyle}>
            <div style={toggleRowStyle}>
              <input
                name="vatApplicable"
                type="checkbox"
                style={checkboxStyle}
                checked={form.vatApplicable}
                onChange={handleChange}
              />
              <span style={toggleLabelStyle}>VAT Applicable</span>
            </div>
            <div style={toggleRowStyle}>
              <input
                name="exciseApplicable"
                type="checkbox"
                style={checkboxStyle}
                checked={form.exciseApplicable}
                onChange={handleChange}
              />
              <span style={toggleLabelStyle}>Excise Applicable</span>
            </div>
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
        </div>
      </FormCard>
    </form>
  );
}
