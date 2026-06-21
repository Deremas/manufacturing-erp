"use client";

import React from "react";
import {
  PageHeader,
  FormCard,
  ActionButtons,
  StatusBadge,
  EmptyState,
} from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Unit } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Pencil,
  Trash2,
  ArrowLeft,
  Ruler,
  Activity,
  Clock,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface UnitDetailPageProps {
  unit?: Unit;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
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

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const fieldValueStyle: React.CSSProperties = {
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
// Component
// ----------------------------------------------------------------------------
export default function UnitDetailPage({
  unit,
  onEdit,
  onDelete,
  onBack,
  loading,
}: UnitDetailPageProps) {
  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <span
          style={{
            fontFamily: typography.fontFamily,
            color: colors.text.secondary,
          }}
        >
          Loading unit details...
        </span>
      </div>
    );
  }

  if (!unit) {
    return (
      <EmptyState
        title="Unit not found"
        message="This record is only shown when it exists in the database."
        action={
          onBack
            ? { label: "Back", onClick: onBack }
            : { label: "Back", onClick: () => window.history.back() }
        }
      />
    );
  }

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Units of Measure", href: "/master-data/units" },
    { label: unit.name },
  ];

  const actions: Action[] = [
    ...(onBack
      ? [
          {
            label: "Back",
            variant: "secondary" as const,
            icon: <ArrowLeft size={16} />,
            onClick: onBack,
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            label: "Edit",
            variant: "primary" as const,
            icon: <Pencil size={16} />,
            onClick: onEdit,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: "Delete",
            variant: "danger" as const,
            icon: <Trash2 size={16} />,
            onClick: onDelete,
          },
        ]
      : []),
  ];

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <span style={fieldValueStyle}>{value ?? "\u2014"}</span>
    </div>
  );

  return (
    <div style={pageStyle}>
      <PageHeader
        title={unit.name}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {/* Profile Header */}
      <div style={headerBannerStyle}>
        <div style={headerInfoStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: radius.scale.md,
                backgroundColor: colors.primary[100],
                color: colors.primary[700],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              <Ruler size={24} />
            </div>
            <div>
              <h2 style={headerNameStyle}>{unit.name}</h2>
              <span style={headerSubStyle}>
                {unit.abbreviation} &middot; {unit.type}
              </span>
            </div>
          </div>
        </div>
        <StatusBadge status={unit.isActive ? "active" : "inactive"} />
      </div>

      {/* Unit Information Card */}
      <FormCard title="Unit Information" variant="teal-header">
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Details</h4>
          <div style={gridStyle2}>
            {renderField("Name", unit.name)}
            {renderField("Abbreviation", unit.abbreviation)}
            {renderField("Type", unit.type)}
            {renderField("Status", unit.isActive ? "Active" : "Inactive")}
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
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <span style={timelineTitleStyle}>Unit Created</span>
              <span style={timelineDateStyle}>
                {/* TODO: Display actual creation date from API */}
                <Clock
                  size={12}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />
                Record created
              </span>
            </div>
          </div>
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <span style={timelineTitleStyle}>Last Updated</span>
              <span style={timelineDateStyle}>
                {/* TODO: Display actual update date from API */}
                <Clock
                  size={12}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />
                Record modified
              </span>
            </div>
          </div>
        </div>
      </FormCard>
    </div>
  );
}
