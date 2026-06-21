"use client";

import React from "react";
import {
  PageHeader,
  FormCard,
  ActionButtons,
  StatusBadge,
  DataTable,
} from "@/components/shared";
import type { Breadcrumb, Action, Column, TableAction } from "@/components/shared";
import type { Category } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

export interface CategoryDetailPageProps {
  category: Category;
  subCategories?: Category[];
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  onViewSubCategory?: (id: string) => void;
  loading?: boolean;
}

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

const formatDate = (dateStr?: string) => {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function CategoryDetailPage({
  category,
  subCategories = [],
  onEdit,
  onDelete,
  onBack,
  onViewSubCategory,
  loading,
}: CategoryDetailPageProps) {
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
    { label: "Categories", href: "/master-data/categories" },
    { label: category.name },
  ];

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value ?? "\u2014"}</span>
    </div>
  );

  const subCategoryColumns: Column<Category>[] = [
    { key: "name", label: "Name", sortable: true },
    {
      key: "description",
      label: "Description",
      render: (value) => value ?? "\u2014",
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const subCategoryActions: TableAction[] = [
    {
      label: "View",
      onClick: (record) => {
        if (onViewSubCategory) {
          onViewSubCategory(record.id);
        } else {
          console.log("View sub-category", record.id);
        }
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <span
          style={{
            fontFamily: typography.fontFamily,
            color: colors.text.secondary,
          }}
        >
          Loading category details...
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
        title={category.name}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={headerBannerStyle}>
        <div style={headerInfoStyle}>
          <h2 style={headerNameStyle}>{category.name}</h2>
          <span style={headerSubStyle}>
            {category.parentCategoryName
              ? `Parent: ${category.parentCategoryName}`
              : "Top-level Category"}
          </span>
        </div>
        <StatusBadge status={category.isActive ? "active" : "inactive"} />
      </div>

      <FormCard title="Category Information" variant="teal-header">
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Details</h4>
          <div style={gridStyle2}>
            {renderField("Name", category.name)}
            {renderField(
              "Parent Category",
              category.parentCategoryName || category.parentCategoryId || "\u2014",
            )}
            {renderField("Status", category.isActive ? "Active" : "Inactive")}
          </div>
          <div style={{ marginTop: "16px" }}>
            {renderField("Description", category.description || "\u2014")}
          </div>
        </div>
      </FormCard>

      <FormCard title="Sub-Categories" variant="teal-header">
        <DataTable
          columns={subCategoryColumns}
          data={subCategories}
          actions={subCategoryActions}
          emptyState={
            <div style={{ padding: "24px", textAlign: "center" }}>
              <span
                style={{
                  fontFamily: typography.fontFamily,
                  color: colors.text.secondary,
                }}
              >
                No sub-categories found.
              </span>
            </div>
          }
          recordCount={subCategories.length}
        />
      </FormCard>

      <FormCard title="Activity" variant="teal-header">
        <div style={timelineStyle}>
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <span style={timelineTitleStyle}>Category Created</span>
              <span style={timelineDateStyle}>
                {formatDate(
                  "createdAt" in category
                    ? (category as any).createdAt
                    : undefined,
                )}
              </span>
            </div>
          </div>
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <span style={timelineTitleStyle}>Last Updated</span>
              <span style={timelineDateStyle}>
                {formatDate(
                  "updatedAt" in category
                    ? (category as any).updatedAt
                    : undefined,
                )}
              </span>
            </div>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
