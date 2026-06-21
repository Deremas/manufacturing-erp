"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Role } from "../types";
import type { PermissionGroup } from "@/lib/administration-db";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Shield, Save, X } from "lucide-react";

export interface RoleFormPageProps {
  initialData?: Role | null;
  isCreating?: boolean;
  permissionGroups?: PermissionGroup[];
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const formGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: "20px",
  height: "48px",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "100px",
  resize: "vertical",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: "16px",
};

const moduleGroupStyle: React.CSSProperties = {
  border: `1px solid ${colors.border}`,
  borderRadius: radius.scale.md,
  overflow: "hidden",
};

const moduleHeaderStyle: React.CSSProperties = {
  padding: "10px 16px",
  backgroundColor: "#f9fafb",
  borderBottom: `1px solid ${colors.border}`,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
};

const moduleBodyStyle: React.CSSProperties = {
  padding: "12px 16px",
  display: "flex",
  flexWrap: "wrap",
  gap: "10px",
};

const checkboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  cursor: "pointer",
};

export default function RoleFormPage({
  initialData,
  isCreating = true,
  permissionGroups = [],
}: RoleFormPageProps) {
  const router = useRouter();
  const isSystemRole = Boolean(initialData?.isSystem);
  const [name, setName] = useState(initialData?.name ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [status, setStatus] = useState(initialData?.isActive !== false ? "active" : "inactive");
  const [permissions, setPermissions] = useState<string[]>(initialData?.permissions ?? []);
  const [saving, setSaving] = useState(false);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Roles", href: "/administration/roles" },
    { label: isCreating ? "Create Role" : "Edit Role" },
  ];

  const togglePermission = (perm: string) => {
    if (isSystemRole) return;
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((item) => item !== perm) : [...prev, perm],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { name, description, permissions, isActive: status === "active" };
      const response = await fetch(
        isCreating ? "/api/administration/roles" : `/api/administration/roles/${initialData?.id}`,
        {
          method: isCreating ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error("Failed to save role");
      }
      router.push("/administration/roles");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => router.push("/administration/roles"),
    },
    {
      label: saving ? "Saving..." : "Save",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSave,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isCreating ? "Create Role" : "Edit Role"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard title="Role Details" icon={<Shield size={18} />}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={rowStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Role Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Procurement Manager"
              />
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={textareaStyle}
              placeholder="Enter role description"
            />
          </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={isSystemRole}
                style={inputStyle}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {isSystemRole && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: radius.scale.md,
                  backgroundColor: "#ecfeff",
                  border: "1px solid #a5f3fc",
                  color: colors.text.primary,
                  fontSize: typography.sizes.small.fontSize,
                }}
              >
                System roles stay fully permitted and active.
              </div>
            )}
          </div>
        </FormCard>

      <FormCard
        title={`Permission Matrix (${permissions.length} selected)`}
        icon={<Shield size={18} />}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {permissionGroups.map((group) => (
            <div key={group.module} style={moduleGroupStyle}>
              <div style={moduleHeaderStyle}>{group.label}</div>
              <div style={moduleBodyStyle}>
                {group.permissions.map((permission) => {
                  const key = `${permission.module}.${permission.action}`;
                  return (
                    <label key={permission.id} style={checkboxLabelStyle}>
                      <input
                        type="checkbox"
                        checked={permissions.includes(key)}
                        onChange={() => togglePermission(key)}
                        disabled={isSystemRole}
                        style={{
                          accentColor: colors.primary[600],
                          width: 16,
                          height: 16,
                        }}
                      />
                      {permission.label}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "16px 40px",
        }}
      >
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}
