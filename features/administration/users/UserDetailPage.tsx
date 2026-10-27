"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { publicEditUrl } from "@/lib/routing/urls";
import { PageHeader, FormCard, ActionButtons, HistoryActionBadge } from "@/components/shared";
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
  MapPin,
  Shield,
  Activity,
  Clock,
  CheckCircle2,
} from "lucide-react";

export interface UserDetailPageProps {
  user?: UserType;
  auditEntries?: Array<{
    id: string;
    action: string;
    userName: string;
    timestamp: string;
  }>;
}

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

export default function UserDetailPage({
  user,
  auditEntries = [],
}: UserDetailPageProps) {
  const router = useRouter();

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

  const pageActions: Action[] = [
    {
      label: "Back",
      variant: "secondary",
      icon: <ArrowLeft size={16} />,
      onClick: () => router.push("/administration/users"),
    },
    {
      label: "Edit",
      variant: "primary",
      icon: <Pencil size={16} />,
      onClick: () => router.push(publicEditUrl("administration.user", user.publicId)),
    },
    {
      label: user.isActive ? "Deactivate" : "Activate",
      variant: "danger",
      icon: <XCircle size={16} />,
      onClick: async () => {
        const confirmed = window.confirm(
          `${user.isActive ? "Deactivate" : "Activate"} user "${user.name}"?`,
        );
        if (!confirmed) return;

        const response = await fetch(`/api/administration/users/${user.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !user.isActive }),
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          window.alert(payload?.error ?? "Failed to update user status.");
          return;
        }

        router.refresh();
      },
    },
  ];

  const initials = user.name
    .split(" ")
    .map((name) => name[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const salesPermissions = user.permissions.filter((permission) => permission.startsWith("sales."));
  const allowedOverrides = user.salesAllowPermissions ?? [];
  const deniedOverrides = user.salesDenyPermissions ?? [];

  return (
    <div style={pageStyle}>
      <PageHeader
        recordKind="admin.user"
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
            <span>{user.phone || "No phone number"}</span>
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
              <span style={infoValueStyle}>{user.role || "Not assigned"}</span>
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
                {user.permissions.length === 0 ? (
                  <span style={infoValueStyle}>No explicit permissions</span>
                ) : (
                  user.permissions.map((permission) => (
                    <span key={permission} style={badgeStyle}>
                      {permission}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </FormCard>

        <FormCard title="Accessible Locations" icon={<MapPin size={18} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
              Sales access is location-scoped. These assigned locations determine where the user can sell and which sales records they can view.
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {user.locations.length === 0 ? (
              <span style={infoValueStyle}>No assigned locations</span>
            ) : (
              user.locations.map((location) => (
                <span key={location} style={badgeStyle}>
                  <MapPin size={12} style={{ marginRight: "4px" }} />
                  {location}
                </span>
              ))
            )}
            </div>
          </div>
        </FormCard>
      </div>

      <FormCard title="Sales Access Summary" icon={<Shield size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
            Sales access is a combination of assigned locations and role permissions like factory, branch, truck, agent, and loading actions.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {salesPermissions.length === 0 ? (
              <span style={infoValueStyle}>No sales-specific permission flags assigned. Access falls back to general role behavior.</span>
            ) : (
              salesPermissions.map((permission) => (
                <span key={permission} style={badgeStyle}>
                  {permission}
                </span>
              ))
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "6px" }}>
            <div>
              <div style={infoLabelStyle}>User Allow Overrides</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {allowedOverrides.length === 0 ? (
                  <span style={infoValueStyle}>No explicit allow overrides</span>
                ) : (
                  allowedOverrides.map((permission) => (
                    <span key={permission} style={badgeStyle}>
                      {permission}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div>
              <div style={infoLabelStyle}>User Deny Overrides</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "6px" }}>
                {deniedOverrides.length === 0 ? (
                  <span style={infoValueStyle}>No explicit deny overrides</span>
                ) : (
                  deniedOverrides.map((permission) => (
                    <span
                      key={permission}
                      style={{
                        ...badgeStyle,
                        backgroundColor: "#fef3f2",
                        color: colors.danger[700],
                        border: `1px solid ${colors.danger[200]}`,
                      }}
                    >
                      {permission}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </FormCard>

      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}
      >
        <FormCard title="Recent Activity" icon={<Activity size={18} />}>
          <div style={timelineStyle}>
            {auditEntries.length === 0 ? (
              <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
                No audit activity recorded for this user yet.
              </div>
            ) : (
              auditEntries.slice(0, 5).map((entry) => (
                <div key={entry.id} style={timelineItemStyle}>
                  <div>
                    <div
                      style={{
                        fontSize: typography.sizes.body.fontSize,
                        color: colors.text.primary,
                      }}
                    >
                      <HistoryActionBadge action={entry.action} />
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
                      {new Date(entry.timestamp).toLocaleString("en-KE")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </FormCard>

        <FormCard title="Audit History" icon={<CheckCircle2 size={18} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {auditEntries.length === 0 ? (
              <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
                No audit history recorded for this user yet.
              </div>
            ) : (
              auditEntries.map((entry) => (
                <div
                  key={entry.id}
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
                    <HistoryActionBadge action={entry.action} />
                  </div>
                  <div style={{ color: colors.text.secondary, marginTop: "2px" }}>
                    By {entry.userName} on {new Date(entry.timestamp).toLocaleString("en-KE")}
                  </div>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>
    </div>
  );
}
