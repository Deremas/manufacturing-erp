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
import type { Location } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  ArrowLeft,
  Building2,
  Clock,
  MapPin,
  Pencil,
  Trash2,
} from "lucide-react";

export interface LocationDetailPageProps {
  location?: Location | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  loading?: boolean;
}

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

const headerBannerStyle: React.CSSProperties = {
  backgroundColor: colors.primary[50],
  border: `1px solid ${colors.primary[200]}`,
  borderRadius: "16px",
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
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

function renderField(label: string, value: React.ReactNode) {
  return (
    <div style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <span style={fieldValueStyle}>{value ?? "—"}</span>
    </div>
  );
}

export default function LocationDetailPage({
  location,
  onEdit,
  onDelete,
  onBack,
  loading,
}: LocationDetailPageProps) {
  if (loading) {
    return (
      <div style={{ padding: "24px", color: colors.text.secondary }}>
        Loading location details...
      </div>
    );
  }

  if (!location) {
    return (
      <EmptyState
        title="Location not found"
        message="This page only renders records loaded from the database."
        action={
          onBack
            ? { label: "Back", onClick: onBack }
            : { label: "Back", onClick: () => window.history.back() }
        }
      />
    );
  }

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Locations", href: "/administration/locations" },
    { label: location.locationName },
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

  return (
    <div style={pageStyle}>
      <PageHeader
        title={location.locationName}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={headerBannerStyle}>
        <div>
          <h2 style={headerNameStyle}>{location.locationName}</h2>
          <span style={headerSubStyle}>
            {location.locationCode} &middot; {location.locationType}
          </span>
        </div>
        <StatusBadge status={location.isActive ? "active" : "inactive"} />
      </div>

      <FormCard title="Location Information" variant="teal-header">
        <div style={gridStyle2}>
          {renderField("Code", location.locationCode)}
          {renderField("Name", location.locationName)}
          {renderField("Type", location.locationType)}
          {renderField("Status", location.isActive ? "Active" : "Inactive")}
        </div>
      </FormCard>

      <FormCard title="Address" variant="teal-header">
        <div style={fieldStyle}>
          <span style={fieldLabelStyle}>Physical Address</span>
          <span style={fieldValueStyle}>{location.address ?? "—"}</span>
        </div>
      </FormCard>

      <FormCard title="Activity" variant="teal-header">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <MapPin size={16} />
            <div>
              <div style={fieldValueStyle}>Location created</div>
              <div style={fieldLabelStyle}>DB record only</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <Clock size={16} />
            <div>
              <div style={fieldValueStyle}>Last updated</div>
              <div style={fieldLabelStyle}>DB record only</div>
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Classification" variant="teal-header">
        <div style={gridStyle2}>
          {renderField("Type", location.locationType)}
          {renderField("Active", location.isActive ? "Yes" : "No")}
        </div>
      </FormCard>

      <div
        style={{
          borderRadius: 14,
          border: `1px dashed ${colors.border}`,
          padding: 16,
          color: colors.text.secondary,
          fontFamily: typography.fontFamily,
        }}
      >
        Related operational data will be loaded from the database when available.
      </div>
    </div>
  );
}
