"use client";

import React from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import type { Item } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ItemDetailProps {
  item: Item;
  onEdit?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
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

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const valueStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.regular,
  color: colors.text.primary,
  lineHeight: "24px",
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

const badgeActiveStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "12px",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  backgroundColor: colors.success[50],
  color: colors.success[700],
  border: `1px solid ${colors.success[200]}`,
};

const badgeInactiveStyle: React.CSSProperties = {
  ...badgeActiveStyle,
  backgroundColor: colors.secondary[50],
  color: colors.secondary[600],
  border: `1px solid ${colors.secondary[200]}`,
};

const toggleValueStyle = (value: boolean | undefined): React.CSSProperties => ({
  ...valueStyle,
  color: value ? colors.success[600] : colors.text.secondary,
});

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ItemDetail({
  item,
  onEdit,
  onPrint,
  onDelete,
  onBack,
}: ItemDetailProps) {
  const actions: Action[] = [
    ...(onEdit
      ? [
          {
            label: "Edit",
            variant: "primary" as const,
            onClick: onEdit,
          },
        ]
      : []),
    ...(onPrint
      ? [
          {
            label: "Print",
            variant: "secondary" as const,
            onClick: onPrint,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: "Delete",
            variant: "danger" as const,
            onClick: onDelete,
          },
        ]
      : []),
    ...(onBack
      ? [
          {
            label: "Back",
            variant: "secondary" as const,
            onClick: onBack,
          },
        ]
      : []),
  ];

  const statusBadge = item.isActive ? (
    <span style={badgeActiveStyle}>Active</span>
  ) : (
    <span style={badgeInactiveStyle}>Inactive</span>
  );

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value ?? "\u2014"}</span>
    </div>
  );

  const formatCurrency = (val: number) =>
    `$${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <FormCard
      title="Item Information"
      variant="teal-header"
      footer={{ actions: <ActionButtons actions={actions} /> }}
    >
      {/* Basic Info */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Basic Information</h4>
        <div style={gridStyle}>
          {renderField("Item Code", item.itemCode)}
          {renderField("Item Name", item.itemName)}
          {renderField("SKU", item.sku || "\u2014")}
          {renderField(
            "Category",
            item.categoryName || item.categoryId || "\u2014",
          )}
          {renderField("Item Type", item.itemType || "\u2014")}
          {renderField("Status", statusBadge)}
        </div>
      </div>

      {/* UOM & Pricing */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>UOM & Pricing</h4>
        <div style={gridStyle}>
          {renderField("UOM", item.uomName || item.uomId || "\u2014")}
          {renderField("Standard Cost", formatCurrency(item.standardCost ?? 0))}
          {renderField("Selling Price", formatCurrency(item.sellingPrice ?? 0))}
        </div>
      </div>

      {/* Status & Settings */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Status & Settings</h4>
        <div style={gridStyle}>
          {renderField("Low Stock Alert Level", item.reorderPoint ?? 0)}
          {renderField(
            "VAT Applicable",
            <span style={toggleValueStyle(item.vatApplicable)}>
              {item.vatApplicable ? "Yes" : "No"}
            </span>,
          )}
          {renderField(
            "Excise Applicable",
            <span style={toggleValueStyle(item.exciseApplicable)}>
              {item.exciseApplicable ? "Yes" : "No"}
            </span>,
          )}
        </div>
      </div>
    </FormCard>
  );
}
