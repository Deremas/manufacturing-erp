"use client";

import React, { useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import type { AdjustmentLineItem } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { radius } from "@/components/ui/radius";

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: "200px",
  flex: 1,
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: "80px",
};

const addButtonStyle: React.CSSProperties = {
  padding: "7px 16px",
  border: `1px dashed ${colors.primary[400]}`,
  borderRadius: radius.components.button,
  backgroundColor: "transparent",
  color: colors.primary[600],
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
};

const removeButtonStyle: React.CSSProperties = {
  padding: "6px 12px",
  border: `1px solid ${colors.danger[300]}`,
  borderRadius: radius.components.button,
  backgroundColor: "transparent",
  color: colors.danger[600],
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  cursor: "pointer",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function AdjustmentFormPage() {
  const [location, setLocation] = useState("");
  const [reason, setReason] = useState("");
  const [lineItems, setLineItems] = useState<AdjustmentLineItem[]>([
    {
      itemId: "",
      itemCode: "",
      itemName: "",
      adjustmentType: "increase",
      quantity: 0,
      unitCost: 0,
      reason: "",
    },
  ]);

  const handleAddRow = () => {
    setLineItems((prev) => [
      ...prev,
      {
        itemId: "",
        itemCode: "",
        itemName: "",
        adjustmentType: "increase",
        quantity: 0,
        unitCost: 0,
        reason: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof AdjustmentLineItem,
    value: string | number,
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSaveDraft = () => {
    console.log("Save draft adjustment", { location, reason, lineItems });
  };

  const handleSubmit = () => {
    console.log("Submit adjustment", { location, reason, lineItems });
  };

  const formActions: Action[] = [
    {
      label: "Save Draft",
      variant: "secondary",
      onClick: handleSaveDraft,
    },
    {
      label: "Submit",
      variant: "primary",
      onClick: handleSubmit,
    },
  ];

  const locationOptions = [
    { label: "Main Warehouse", value: "Main Warehouse" },
    { label: "Store B", value: "Store B" },
    { label: "Chemicals Store", value: "Chemicals Store" },
  ];

  const adjustmentTypeOptions = [
    { label: "Increase", value: "increase" },
    { label: "Decrease", value: "decrease" },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Create Stock Adjustment"
        subtitle="Adjust stock quantities and values"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory" },
          { label: "Adjustments", href: "/inventory/adjustments" },
          { label: "Create" },
        ]}
      />

      {/* Adjustment Details */}
      <FormCard title="Adjustment Details" variant="teal-header">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Location *</label>
            <select
              style={selectStyle}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Select location...</option>
              {locationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={{ ...fieldGroupStyle, flexBasis: "100%" }}>
            <label style={labelStyle}>Reason *</label>
            <textarea
              style={textareaStyle}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this adjustment..."
            />
          </div>
        </div>
      </FormCard>

      {/* Line Items */}
      <FormCard title="Adjustment Items">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr auto",
              gap: "8px",
              padding: "8px 0",
              borderBottom: `1px solid ${colors.border}`,
              fontSize: typography.sizes.caption.fontSize,
              fontWeight: typography.weights.semibold,
              color: colors.text.secondary,
            }}
          >
            <span>Item</span>
            <span>Type</span>
            <span>Quantity</span>
            <span>Unit Cost</span>
            <span>Item Reason</span>
            <span></span>
          </div>

          {/* Rows */}
          {lineItems.map((item, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1fr 1fr 1.5fr auto",
                gap: "8px",
                alignItems: "center",
                padding: "4px 0",
              }}
            >
              <select
                style={selectStyle}
                value={item.itemId}
                onChange={(e) =>
                  handleItemChange(index, "itemId", e.target.value)
                }
              >
                <option value="">Select item...</option>
                <option value="PREF-001">Preform 28mm Clear</option>
                <option value="CAP-001">Screw Cap 28mm White</option>
                <option value="LAB-001">Label 500ml</option>
                <option value="CHEM-001">Chlorine 25kg Drum</option>
              </select>
              <select
                style={selectStyle}
                value={item.adjustmentType}
                onChange={(e) =>
                  handleItemChange(index, "adjustmentType", e.target.value)
                }
              >
                {adjustmentTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <input
                style={inputStyle}
                type="number"
                min={0}
                value={item.quantity || ""}
                onChange={(e) =>
                  handleItemChange(index, "quantity", Number(e.target.value))
                }
                placeholder="Qty"
              />
              <input
                style={inputStyle}
                type="number"
                min={0}
                step={0.01}
                value={item.unitCost || ""}
                onChange={(e) =>
                  handleItemChange(index, "unitCost", Number(e.target.value))
                }
                placeholder="Cost"
              />
              <input
                style={inputStyle}
                type="text"
                value={item.reason || ""}
                onChange={(e) =>
                  handleItemChange(index, "reason", e.target.value)
                }
                placeholder="Reason per item..."
              />
              {lineItems.length > 1 && (
                <button
                  style={removeButtonStyle}
                  onClick={() => handleRemoveRow(index)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}

          {/* Add Row Button */}
          <div style={{ marginTop: "8px" }}>
            <button style={addButtonStyle} onClick={handleAddRow}>
              + Add Item
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: `1px solid ${colors.border}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <ActionButtons actions={formActions} />
        </div>
      </FormCard>
    </div>
  );
}
