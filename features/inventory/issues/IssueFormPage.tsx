"use client";

import React, { useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import type { IssueLineItem } from "../types";
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
export default function IssueFormPage() {
  const [department, setDepartment] = useState("");
  const [issuedTo, setIssuedTo] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<IssueLineItem[]>([
    {
      itemId: "",
      itemCode: "",
      itemName: "",
      quantity: 0,
      fromLocation: "",
    },
  ]);

  const handleAddRow = () => {
    setLineItems((prev) => [
      ...prev,
      {
        itemId: "",
        itemCode: "",
        itemName: "",
        quantity: 0,
        fromLocation: "",
      },
    ]);
  };

  const handleRemoveRow = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof IssueLineItem,
    value: string | number,
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSaveDraft = () => {
    console.log("Save draft issue voucher", {
      department,
      issuedTo,
      notes,
      lineItems,
    });
  };

  const handleSubmit = () => {
    console.log("Submit issue voucher", {
      department,
      issuedTo,
      notes,
      lineItems,
    });
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

  const departmentOptions = [
    { label: "Production", value: "Production" },
    { label: "Quality Control", value: "Quality Control" },
    { label: "Maintenance", value: "Maintenance" },
    { label: "Administration", value: "Administration" },
  ];

  const locationOptions = [
    { label: "Main Warehouse", value: "Main Warehouse" },
    { label: "Store B", value: "Store B" },
    { label: "Chemicals Store", value: "Chemicals Store" },
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
        title="Create Issue Voucher"
        subtitle="Issue materials from stores"
        breadcrumbs={[
          { label: "Inventory", href: "/inventory" },
          { label: "Issue Vouchers", href: "/inventory/issues" },
          { label: "Create" },
        ]}
      />

      {/* Issue Details */}
      <FormCard title="Issue Details" variant="teal-header">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Department *</label>
            <select
              style={selectStyle}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="">Select department...</option>
              {departmentOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Issued To *</label>
            <input
              style={inputStyle}
              type="text"
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
              placeholder="Name of recipient"
            />
          </div>
          <div style={{ ...fieldGroupStyle, flexBasis: "100%" }}>
            <label style={labelStyle}>Notes</label>
            <textarea
              style={textareaStyle}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
        </div>
      </FormCard>

      {/* Line Items */}
      <FormCard title="Issue Items">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {/* Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1.5fr auto",
              gap: "8px",
              padding: "8px 0",
              borderBottom: `1px solid ${colors.border}`,
              fontSize: typography.sizes.caption.fontSize,
              fontWeight: typography.weights.semibold,
              color: colors.text.secondary,
            }}
          >
            <span>Item</span>
            <span>Quantity</span>
            <span>From Location</span>
            <span></span>
          </div>

          {/* Rows */}
          {lineItems.map((item, index) => (
            <div
              key={index}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1fr 1.5fr auto",
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
                <option value="BOT-001">Bottle 500ml Clear</option>
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
              <select
                style={selectStyle}
                value={item.fromLocation}
                onChange={(e) =>
                  handleItemChange(index, "fromLocation", e.target.value)
                }
              >
                <option value="">Select location...</option>
                {locationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
