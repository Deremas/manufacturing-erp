"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FormCard,
  ActionButtons,
  HistoryActionBadge,
  StatusBadge,
} from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Item } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { formatCurrency } from "@/lib/utils/cn";
import { useSystemPreferences } from "@/lib/client/use-system-preferences";
import { getCleanItemName, getDisplayItemCode } from "@/lib/item-display";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ItemDetailPageProps {
  item: Item;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  editHref?: string;
  backHref?: string;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle3: React.CSSProperties = {
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

const headerBannerStyle: React.CSSProperties = {
  backgroundColor: colors.primary[50],
  border: `1px solid ${colors.primary[200]}`,
  borderRadius: "16px",
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const headerInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const headerCodeStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.primary[600],
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const headerNameStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h3.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
};

const timelineStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const timelineItemStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  paddingBottom: "12px",
  borderBottom: `1px solid ${colors.border}`,
};

const timelineDotStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: colors.primary[500],
  marginTop: "6px",
  flexShrink: 0,
};

const timelineContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const timelineTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.primary,
};

const timelineDateStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ItemDetailPage({
  item,
  onEdit,
  onDelete,
  onBack,
  editHref,
  backHref,
  loading,
}: ItemDetailPageProps) {
  const router = useRouter();
  const { currencyCode, currencyLabel } = useSystemPreferences();
  const displayItemCode = getDisplayItemCode({
    itemCode: item.itemCode,
    itemName: item.itemName,
    itemTypeCode: item.itemType,
    itemTypeName: item.itemTypeName,
  });
  const cleanItemName = getCleanItemName(item.itemName, displayItemCode);

  const actions: Action[] = [
    ...(onEdit
      ? [{ label: "Edit", variant: "primary" as const, onClick: onEdit }]
      : editHref
        ? [{ label: "Edit", variant: "primary" as const, onClick: () => router.push(editHref) }]
      : []),
    ...(onDelete
      ? [{ label: "Delete", variant: "danger" as const, onClick: onDelete }]
      : []),
    ...(onBack
      ? [{ label: "Back", variant: "secondary" as const, onClick: onBack }]
      : backHref
        ? [{ label: "Back", variant: "secondary" as const, onClick: () => router.push(backHref) }]
      : []),
  ];

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Items", href: "/master-data/items" },
    { label: displayItemCode || item.itemCode },
  ];

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value ?? "\u2014"}</span>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <span
          style={{
            fontFamily: typography.fontFamily,
            color: colors.text.secondary,
          }}
        >
          Loading item details...
        </span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        recordKind="md.item"
        title={cleanItemName || item.itemName}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {/* Profile Header */}
      <div style={headerBannerStyle}>
        <div style={headerInfoStyle}>
          <span style={headerCodeStyle}>{displayItemCode || item.itemCode}</span>
          <h2 style={headerNameStyle}>{cleanItemName || item.itemName}</h2>
          <span style={{ ...labelStyle, textTransform: "none" }}>
            SKU: {item.sku || "\u2014"} &middot; Type:{" "}
            {item.itemType || "\u2014"}
          </span>
        </div>
        <StatusBadge status={item.isActive ? "active" : "inactive"} />
      </div>

      {/* Item Information Card */}
      <FormCard title="Item Information" variant="teal-header">
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Basic Information</h4>
          <div style={gridStyle3}>
            {renderField("Item Code", displayItemCode || item.itemCode)}
            {renderField("Item Name", cleanItemName || item.itemName)}
            {renderField("SKU", item.sku || "\u2014")}
            {renderField("Description", item.description || "\u2014")}
            {renderField(
              "Category",
              item.categoryName || item.categoryId || "\u2014",
            )}
            {renderField("Item Type", item.itemType || "\u2014")}
            {renderField("UOM", item.uomName || item.uomId || "\u2014")}
          </div>
        </div>
      </FormCard>

      {/* Pricing Card */}
      <FormCard title="Item Details" variant="teal-header">
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Pricing</h4>
          <p
            style={{
              margin: "0 0 12px 0",
              color: colors.text.secondary,
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.caption.fontSize,
            }}
          >
            Amounts use the system default currency: {currencyCode} ({currencyLabel})
          </p>
          <div style={gridStyle2}>
            {renderField(
              `Standard Cost (${currencyCode})`,
              formatCurrency(item.standardCost ?? 0, currencyCode),
            )}
            {renderField(
              `Selling Price (${currencyCode})`,
              formatCurrency(item.sellingPrice ?? 0, currencyCode),
            )}
            {renderField("Tax Code", item.purchaseTaxCodeName || item.purchaseTaxCodeId || "\u2014")}
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Inventory Settings</h4>
          <div style={gridStyle2}>
            {renderField("Low Stock Alert", item.reorderPoint ?? 0)}
            {renderField("VAT Applicable", item.vatApplicable ? "Yes" : "No")}
            {renderField(
              "Excise Applicable",
              item.exciseApplicable ? "Yes" : "No",
            )}
          </div>
        </div>
      </FormCard>

      {/* Activity Timeline */}
      <FormCard title="Activity Timeline" variant="teal-header">
        <div style={timelineStyle}>
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <HistoryActionBadge action="UPDATED" label="Item Updated" />
              <span style={timelineDateStyle}>
                {formatDate(item.updatedAt)}
              </span>
            </div>
          </div>
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <HistoryActionBadge action="CREATED" label="Item Created" />
              <span style={timelineDateStyle}>
                {formatDate(item.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
