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
import type { Supplier } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Pencil,
  Trash2,
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MapPin,
  UserIcon,
  Calendar,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface SupplierDetailPageProps {
  supplier?: Supplier;
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

const profileCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "20px",
  padding: "24px",
  backgroundColor: colors.surface,
  borderRadius: radius.components.card,
  border: `1px solid ${colors.border}`,
};

const avatarStyle: React.CSSProperties = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  backgroundColor: colors.primary[600],
  color: colors.text.inverse,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 700,
  fontSize: "24px",
  flexShrink: 0,
};

const infoRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  color: colors.text.secondary,
  fontSize: typography.sizes.small.fontSize,
};

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "12px",
};

const infoItemStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const infoLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.muted,
};

const infoValueStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.primary,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: radius.components.badge,
  backgroundColor: colors.primary[50],
  color: colors.primary[700],
  border: `1px solid ${colors.primary[200]}`,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function SupplierDetailPage({
  supplier,
  onEdit,
  onDelete,
  onBack,
  loading,
}: SupplierDetailPageProps) {
  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <span
          style={{
            fontFamily: typography.fontFamily,
            color: colors.text.secondary,
          }}
        >
          Loading supplier details...
        </span>
      </div>
    );
  }

  if (!supplier) {
    return (
      <EmptyState
        title="Supplier not found"
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
    { label: "Suppliers", href: "/master-data/suppliers" },
    { label: supplier.name },
  ];

  const pageActions: Action[] = [
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

  const initials = supplier.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div style={pageStyle}>
      <PageHeader
        title={supplier.name}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      {/* Profile Header */}
      <div style={profileCardStyle}>
        <div style={avatarStyle}>{initials}</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: typography.sizes.h5.fontSize,
                fontWeight: typography.weights.semibold,
              }}
            >
              {supplier.name}
            </h2>
            <StatusBadge
              status={supplier.isActive ? "active" : "inactive"}
            />
          </div>
          <div style={infoRowStyle}>
            <UserIcon size={14} />
            <span>Contact: {supplier.contactPerson || "\u2014"}</span>
          </div>
          <div style={infoRowStyle}>
            <Mail size={14} />
            <span>{supplier.email || "\u2014"}</span>
          </div>
          <div style={infoRowStyle}>
            <Phone size={14} />
            <span>{supplier.phone || "\u2014"}</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
          }}
        >
          <span
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.caption.fontSize,
              fontWeight: typography.weights.medium,
              color: colors.text.muted,
              textTransform: "uppercase",
            }}
          >
            Supplier Code
          </span>
          <span
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.h5.fontSize,
              fontWeight: typography.weights.bold,
              color: colors.primary[600],
            }}
          >
            {supplier.supplierCode}
          </span>
        </div>
      </div>

      {/* Contact & Terms Info */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
        }}
      >
        <FormCard title="Contact Information" icon={<Users size={18} />}>
          <div style={infoGridStyle}>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Contact Person</span>
              <span style={infoValueStyle}>
                <UserIcon
                  size={14}
                  style={{ marginRight: "6px", verticalAlign: "middle" }}
                />
                {supplier.contactPerson || "\u2014"}
              </span>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Phone</span>
              <span style={infoValueStyle}>
                <Phone
                  size={14}
                  style={{ marginRight: "6px", verticalAlign: "middle" }}
                />
                {supplier.phone || "\u2014"}
              </span>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Email</span>
              <span style={infoValueStyle}>
                <Mail
                  size={14}
                  style={{ marginRight: "6px", verticalAlign: "middle" }}
                />
                {supplier.email || "\u2014"}
              </span>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={infoLabelStyle}>Address</span>
              <span style={infoValueStyle}>
                <MapPin
                  size={14}
                  style={{ marginRight: "6px", verticalAlign: "middle" }}
                />
                {supplier.address || "\u2014"}
              </span>
            </div>
          </div>
        </FormCard>

        <FormCard title="Terms & Status" icon={<Calendar size={18} />}>
          <div style={infoGridStyle}>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Payment Terms</span>
              <span
                style={{
                  ...infoValueStyle,
                  fontSize: typography.sizes.h5.fontSize,
                  fontWeight: typography.weights.bold,
                  color: colors.primary[600],
                }}
              >
                {supplier.paymentTerms || "\u2014"}
              </span>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Status</span>
              <span style={infoValueStyle}>
                <span style={badgeStyle}>
                  {supplier.isActive ? "Active" : "Inactive"}
                </span>
              </span>
            </div>
          </div>
        </FormCard>
      </div>
    </div>
  );
}
