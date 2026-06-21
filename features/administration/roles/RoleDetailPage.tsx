"use client";

import React from "react";
import { PageHeader, FormCard, ActionButtons, StatusBadge } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Role } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Shield, Users, Pencil, ArrowLeft, CheckCircle } from "lucide-react";

export interface RoleDetailPageProps {
  role?: Role | null;
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 10px",
  borderRadius: radius.components.badge,
  backgroundColor: colors.primary[50],
  color: colors.primary[700],
  border: `1px solid ${colors.primary[200]}`,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
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

export default function RoleDetailPage({ role }: RoleDetailPageProps) {
  if (!role) {
    return (
      <div style={pageStyle}>
        <PageHeader title="Role not found" />
      </div>
    );
  }

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Roles", href: "/administration/roles" },
    { label: role.name },
  ];

  const pageActions: Action[] = [
    {
      label: "Back",
      variant: "secondary",
      icon: <ArrowLeft size={16} />,
      onClick: () => window.history.back(),
    },
    {
      label: "Edit",
      variant: "primary",
      icon: <Pencil size={16} />,
      onClick: () => window.location.assign(`/administration/roles/${role.id}/edit`),
    },
  ];

  const groupedPermissions = (role.permissions ?? []).reduce<
    Record<string, string[]>
  >((acc, perm) => {
    const [module] = perm.split(".");
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {});

  return (
    <div style={pageStyle}>
      <PageHeader
        title={role.name}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <FormCard title="Role Information" icon={<Shield size={18} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <div style={{ fontSize: typography.sizes.caption.fontSize, color: colors.text.muted }}>
                Name
              </div>
              <div style={{ fontSize: typography.sizes.body.fontSize, fontWeight: typography.weights.medium }}>
                {role.name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: typography.sizes.caption.fontSize, color: colors.text.muted }}>
                Description
              </div>
              <div style={{ fontSize: typography.sizes.body.fontSize, color: colors.text.secondary }}>
                {role.description || "—"}
              </div>
            </div>
            <div>
              <div style={{ fontSize: typography.sizes.caption.fontSize, color: colors.text.muted }}>
                Status
              </div>
              <div style={{ marginTop: 4 }}>
                <StatusBadge status={role.isActive ? "active" : "inactive"} />
              </div>
            </div>
            {role.isSystem && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  alignSelf: "flex-start",
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  backgroundColor: "#ecfeff",
                  border: "1px solid #a5f3fc",
                  color: "#0f766e",
                  fontSize: typography.sizes.caption.fontSize,
                  fontWeight: typography.weights.semibold,
                }}
              >
                System Role
              </div>
            )}
          </div>
        </FormCard>

        <FormCard title="Users with this Role" icon={<Users size={18} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {(role.users ?? []).length === 0 ? (
              <div style={{ color: colors.text.muted, fontSize: typography.sizes.small.fontSize }}>
                No users assigned to this role.
              </div>
            ) : (
              role.users!.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 12px",
                    backgroundColor: "#f9fafb",
                    borderRadius: radius.scale.sm,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      backgroundColor: colors.primary[100],
                      color: colors.primary[700],
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: 11,
                    }}
                  >
                    {user.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: typography.sizes.body.fontSize, fontWeight: typography.weights.medium }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: typography.sizes.caption.fontSize, color: colors.text.muted }}>
                      {user.email ?? "—"}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </FormCard>
      </div>

      <FormCard title={`Permissions (${role.permissions?.length ?? 0})`} icon={<Shield size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(groupedPermissions).map(([module, perms]) => (
            <div key={module}>
              <h4 style={sectionTitleStyle}>
                {module.replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())}
              </h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {perms.map((perm) => (
                  <span key={perm} style={badgeStyle}>
                    <CheckCircle size={12} color={colors.success[500]} />
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormCard>
    </div>
  );
}
