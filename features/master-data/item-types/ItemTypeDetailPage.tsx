"use client";

import React from "react";
import {
  PageHeader,
  FormCard,
  ActionButtons,
  StatusBadge,
} from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { ItemType } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ItemTypeDetailPageProps {
  itemType: ItemType;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
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

const headerNameStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h3.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
};

const headerSubStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function ItemTypeDetailPage({
  itemType,
  onEdit,
  onDelete,
  onBack,
  loading,
}: ItemTypeDetailPageProps) {
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

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Item Types", href: "/master-data/item-types" },
    { label: itemType.name },
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
          Loading item type details...
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
        title={itemType.name}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {/* Profile Header */}
      <div style={headerBannerStyle}>
        <div style={headerInfoStyle}>
          <h2 style={headerNameStyle}>{itemType.name}</h2>
          <span style={headerSubStyle}>Code: {itemType.code}</span>
        </div>
        <StatusBadge status={itemType.isActive ? "active" : "inactive"} />
      </div>

      {/* Type Information Card */}
      <FormCard title="Type Information" variant="teal-header">
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Details</h4>
          <div style={gridStyle2}>
            {renderField("Name", itemType.name)}
            {renderField("Code", itemType.code)}
            {renderField("Status", itemType.isActive ? "Active" : "Inactive")}
          </div>
          <div style={{ marginTop: "16px" }}>
            {renderField("Description", itemType.description || "\u2014")}
          </div>
        </div>
      </FormCard>

      {/* Activity Timeline */}
      <FormCard title="Activity" variant="teal-header">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "12px",
              paddingBottom: "12px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: colors.primary[500],
                marginTop: "6px",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.body.fontSize,
                  fontWeight: typography.weights.medium,
                  color: colors.text.primary,
                }}
              >
                Item Type Created
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.text.secondary,
                }}
              >
                {/* TODO: Display actual creation date from API */}
                Record created
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              paddingBottom: "12px",
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                backgroundColor: colors.primary[500],
                marginTop: "6px",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
              }}
            >
              <span
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.body.fontSize,
                  fontWeight: typography.weights.medium,
                  color: colors.text.primary,
                }}
              >
                Last Updated
              </span>
              <span
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.text.secondary,
                }}
              >
                {/* TODO: Display actual update date from API */}
                Record modified
              </span>
            </div>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
