"use client";

import React from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { User as UserType } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Pencil,
  XCircle,
  ArrowLeft,
  Mail,
  Phone,
  UserIcon,
  MapPin,
  Shield,
  Activity,
  Clock,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface UserDetailPageProps {
  user?: UserType;
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

const timelineStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const timelineItemStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  paddingLeft: "12px",
  borderLeft: `2px solid ${colors.border}`,
  paddingBottom: "12px",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function UserDetailPage({ user }: UserDetailPageProps) {
  if (!user) {
    return (
      <div style={pageStyle}>
        <PageHeader title="User not found" />
      </div>
    );
  }

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Users", href: "/administration/users" },
    { label: user.name },
  ];

  const handleEdit = () => console.log("Edit user", user.id);
  const handleDeactivate = () => console.log("Deactivate user", user.id);
  const handleBack = () => console.log("Back to users");

  const pageActions: Action[] = [
    {
      label: "Back",
      variant: "secondary",
      icon: <ArrowLeft size={16} />,
      onClick: handleBack,
    },
    {
      label: "Edit",
      variant: "primary",
      icon: <Pencil size={16} />,
      onClick: handleEdit,
    },
    {
      label: "Deactivate",
      variant: "danger",
      icon: <XCircle size={16} />,
      onClick: handleDeactivate,
    },
  ];

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const recentActivities = [
    { action: "Logged in", date: "2026-06-18 08:30 AM" },
    { action: "Updated user profile", date: "2026-06-17 02:15 PM" },
    { action: "Created purchase order PO-001", date: "2026-06-16 11:00 AM" },
    { action: "Approved inventory adjustment", date: "2026-06-15 09:45 AM" },
  ];

  const auditHistory = [
    {
      field: "Role",
      oldValue: "Warehouse Operator",
      newValue: "Administrator",
      changedBy: "Admin",
      date: "2026-06-10",
    },
    {
      field: "Status",
      oldValue: "Inactive",
      newValue: "Active",
      changedBy: "Admin",
      date: "2026-06-01",
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={user.name}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

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
          <h2
            style={{
              margin: 0,
              fontSize: typography.sizes.h5.fontSize,
              fontWeight: typography.weights.semibold,
            }}
          >
            {user.name}
          </h2>
          <div style={infoRowStyle}>
            <Mail size={14} />
            <span>{user.email}</span>
          </div>
          <div style={infoRowStyle}>
            <Phone size={14} />
            <span>{user.phone}</span>
          </div>
        </div>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        <FormCard title="Role & Permissions" icon={<Shield size={18} />}>
          <div style={infoGridStyle}>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Role</span>
              <span style={infoValueStyle}>{user.role}</span>
            </div>
            <div style={infoItemStyle}>
              <span style={infoLabelStyle}>Status</span>
              <span style={infoValueStyle}>
                {user.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <span style={infoLabelStyle}>Permissions</span>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginTop: "4px",
                }}
              >
                {user.permissions.map((perm) => (
                  <span key={perm} style={badgeStyle}>
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </FormCard>

        <FormCard title="Accessible Locations" icon={<MapPin size={18} />}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {user.locations.map((loc) => (
              <span key={loc} style={badgeStyle}>
                <MapPin size={12} style={{ marginRight: "4px" }} />
                {loc}
              </span>
            ))}
          </div>
        </FormCard>
      </div>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        <FormCard title="Recent Activity" icon={<Activity size={18} />}>
          <div style={timelineStyle}>
            {recentActivities.map((act, i) => (
              <div key={i} style={timelineItemStyle}>
                <div>
                  <div
                    style={{
                      fontSize: typography.sizes.body.fontSize,
                      color: colors.text.primary,
                    }}
                  >
                    {act.action}
                  </div>
                  <div
                    style={{
                      fontSize: typography.sizes.caption.fontSize,
                      color: colors.text.muted,
                      marginTop: "2px",
                    }}
                  >
                    <Clock
                      size={12}
                      style={{ marginRight: "4px", verticalAlign: "middle" }}
                    />
                    {act.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </FormCard>

        <FormCard title="Audit History" icon={<Activity size={18} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {auditHistory.map((audit, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: radius.scale.sm,
                  fontSize: typography.sizes.small.fontSize,
                }}
              >
                <div
                  style={{
                    fontWeight: typography.weights.semibold,
                    color: colors.text.primary,
                  }}
                >
                  {audit.field}
                </div>
                <div style={{ color: colors.text.secondary, marginTop: "2px" }}>
                  {audit.oldValue} → {audit.newValue}
                </div>
                <div
                  style={{
                    color: colors.text.muted,
                    fontSize: typography.sizes.caption.fontSize,
                    marginTop: "2px",
                  }}
                >
                  Changed by {audit.changedBy} on {audit.date}
                </div>
              </div>
            ))}
          </div>
        </FormCard>
      </div>
    </div>
  );
}
