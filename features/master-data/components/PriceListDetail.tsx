"use client";

import React from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import type { PriceList } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface PriceListDetailProps {
  priceList: PriceList;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle: React.CSSProperties = {
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
  color: colors.text.primary,
  lineHeight: "24px",
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

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function PriceListDetail({
  priceList,
  onEdit,
  onDelete,
  onBack,
}: PriceListDetailProps) {
  const actions: Action[] = [
    ...(onEdit
      ? [{ label: "Edit", variant: "primary" as const, onClick: onEdit }]
      : []),
    ...(onDelete
      ? [{ label: "Delete", variant: "danger" as const, onClick: onDelete }]
      : []),
    ...(onBack
      ? [{ label: "Back", variant: "secondary" as const, onClick: onBack }]
      : []),
  ];

  const statusBadge = priceList.isActive ? (
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
      title="Price List Information"
      variant="teal-header"
      footer={{ actions: <ActionButtons actions={actions} /> }}
    >
      <div style={gridStyle}>
        {renderField("Item", priceList.itemName || priceList.itemId)}
        {renderField("Customer Group", priceList.customerGroup || "\u2014")}
        {renderField("Price", formatCurrency(priceList.price))}
        {renderField("Effective Date", priceList.effectiveDate || "\u2014")}
        {renderField("Status", statusBadge)}
      </div>
    </FormCard>
  );
}
