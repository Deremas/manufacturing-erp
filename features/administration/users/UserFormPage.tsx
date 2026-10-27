"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { User as UserType } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Eye, EyeOff, UserIcon, ShieldCheck, Save, X } from "lucide-react";
import { publicViewUrlFromPayload } from "@/lib/routing/urls";

export interface OptionItem {
  label: string;
  value: string;
}

export interface UserFormPageProps {
  initialData?: UserType;
  isCreating?: boolean;
  roles?: OptionItem[];
  locations?: OptionItem[];
  departments?: OptionItem[];
  submitEndpoint?: string;
  successHref?: string;
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
  border: `1px solid ${colors.inputBorder}`,
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
  height: "48px",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
};

const stickyFooterStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  zIndex: 10,
  backgroundColor: "#f8fafc",
  borderTop: `1px solid ${colors.border}`,
  padding: "16px 40px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
};

const passwordToggleStyle: React.CSSProperties = {
  position: "absolute",
  top: "50%",
  right: 12,
  transform: "translateY(-50%)",
  width: 30,
  height: 30,
  border: "none",
  borderRadius: 8,
  background: "transparent",
  color: colors.text.secondary,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
};

const salesPermissionOptions = [
  { key: "sales.factory.use", label: "Factory Sales" },
  { key: "sales.branch.use", label: "Branch Sales" },
  { key: "sales.truck.use", label: "Truck Sales" },
  { key: "sales.agent.use", label: "Agent Sales" },
  { key: "sales.loading.create", label: "Create Loading" },
  { key: "sales.loading.confirm", label: "Confirm Loading" },
  { key: "sales.loading.cancel", label: "Cancel Loading" },
] as const;

export default function UserFormPage({
  initialData,
  isCreating = true,
  roles = [],
  locations = [],
  departments = [],
  submitEndpoint,
  successHref = "/administration/users",
}: UserFormPageProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initialData?.name ?? "");
  const [username, setUsername] = useState(initialData?.username ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState(
    initialData?.isActive !== false ? "active" : "inactive",
  );
  const [roleId, setRoleId] = useState(initialData?.roleId ?? "");
  const [defaultLocationId, setDefaultLocationId] = useState(
    initialData?.defaultLocationId ?? "",
  );
  const [accessibleLocationIds, setAccessibleLocationIds] = useState<string[]>(
    initialData?.accessibleLocationIds ?? [],
  );
  const [accessibleDepartmentIds, setAccessibleDepartmentIds] = useState<string[]>(initialData?.accessibleDepartmentIds ?? []);
  const [salesAllowPermissions, setSalesAllowPermissions] = useState<string[]>(
    initialData?.salesAllowPermissions ?? [],
  );
  const [salesDenyPermissions, setSalesDenyPermissions] = useState<string[]>(
    initialData?.salesDenyPermissions ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Users", href: "/administration/users" },
    { label: isCreating ? "Create User" : "Edit User" },
  ];

  const handleSave = async () => {
    setError("");

    if (!fullName.trim() || !email.trim() || !roleId) {
      setError("Full name, email, and role are required.");
      return;
    }

    if (isCreating && !password.trim()) {
      setError("Password is required for a new user.");
      return;
    }

    if ((password || confirmPassword) && password !== confirmPassword) {
      setError("Password and confirm password must match.");
      return;
    }

    if (defaultLocationId && !accessibleLocationIds.includes(defaultLocationId)) {
      setAccessibleLocationIds((current) =>
        current.includes(defaultLocationId)
          ? current
          : [...current, defaultLocationId],
      );
    }

    setSaving(true);
    try {
      const response = await fetch(submitEndpoint ?? "/api/administration/users", {
        method: isCreating ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          username: username.trim() || null,
          email: email.trim(),
          phone: phone.trim() || null,
          password: password.trim() || undefined,
          roleId,
          defaultLocationId: defaultLocationId || null,
          accessibleLocationIds: defaultLocationId
            ? Array.from(new Set([...accessibleLocationIds, defaultLocationId]))
            : accessibleLocationIds,
          accessibleDepartmentIds,
          salesAllowPermissions,
          salesDenyPermissions,
          isActive: status === "active",
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; publicId?: number }
        | null;

      if (!response.ok) {
        setError(payload?.error ?? "Failed to save user.");
        return;
      }

      router.push(
        publicViewUrlFromPayload(
          "administration.user",
          payload,
          successHref ?? "/administration/users",
        ),
      );
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => router.push("/administration/users"),
      disabled: saving,
    },
    {
      label: "Save",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSave,
      loading: saving,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isCreating ? "Create User" : "Edit User"}
        breadcrumbs={breadcrumbs}
      />

      {error ? (
        <div
          style={{
            color: colors.danger[700],
            backgroundColor: colors.danger[50],
            border: `1px solid ${colors.danger[200]}`,
            borderRadius: radius.components.card,
            padding: "12px 14px",
          }}
        >
          {error}
        </div>
      ) : null}

      <FormCard title="Basic Information" icon={<UserIcon size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={inputStyle}
                placeholder="Enter full name"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={inputStyle}
                placeholder="Enter username"
              />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="Enter email address"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>
                Password {isCreating ? "*" : "(optional)"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 52 }}
                  placeholder={
                    isCreating
                      ? "Enter password"
                      : "Leave blank to keep current password"
                  }
                  autoComplete={isCreating ? "new-password" : "off"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={passwordToggleStyle}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>
                Confirm Password {isCreating ? "*" : "(optional)"}
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ ...inputStyle, paddingRight: 52 }}
                  placeholder="Confirm password"
                  autoComplete={isCreating ? "new-password" : "off"}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                  style={passwordToggleStyle}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          </div>

          {!isCreating && (
            <div
              style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.caption.fontSize,
                color: colors.text.secondary,
              }}
            >
              Leave password blank to keep the current password unchanged.
            </div>
          )}

          <div style={formGroupStyle}>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </FormCard>

      <FormCard title="Role & Permission" icon={<ShieldCheck size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Role</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select ...</option>
                {roles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Location</label>
              <select
                value={defaultLocationId}
                onChange={(e) => setDefaultLocationId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select ...</option>
                {locations.map((location) => (
                  <option key={location.value} value={location.value}>
                    {location.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Accessible Locations</label>
            <select
              multiple
              style={{ ...selectStyle, height: "100px", appearance: "listbox" }}
              value={accessibleLocationIds}
              onChange={(e) =>
                setAccessibleLocationIds(
                  Array.from(e.target.selectedOptions).map((option) => option.value),
                )
              }
            >
              {locations.map((location) => (
                <option key={location.value} value={location.value}>
                  {location.label}
                </option>
              ))}
            </select>
            <div
              style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.caption.fontSize,
                color: colors.text.secondary,
                lineHeight: 1.5,
              }}
            >
              Assigned locations control where this user can open POS, Branch Sales, Truck Sales, and which sales history records they can see.
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Accessible Departments</label>
            <select multiple style={{ ...selectStyle, height: "100px", appearance: "listbox" }} value={accessibleDepartmentIds}
              onChange={(event) => setAccessibleDepartmentIds(Array.from(event.target.selectedOptions).map((option) => option.value))}>
              {departments.map((department) => <option key={department.value} value={department.value}>{department.label}</option>)}
            </select>
            <div style={{ fontSize: typography.sizes.caption.fontSize, color: colors.text.secondary }}>Department scope is enforced together with action permission and location scope.</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div
              style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.caption.fontSize,
                color: colors.text.secondary,
                lineHeight: 1.5,
              }}
            >
              User sales policy overrides are applied on top of the selected role. Use `Allow` to grant a sales action for this user even if the role does not grant it. Use `Deny` to block it for this user even if the role grants it.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
              {salesPermissionOptions.map((permission) => {
                const mode = salesDenyPermissions.includes(permission.key)
                  ? "deny"
                  : salesAllowPermissions.includes(permission.key)
                    ? "allow"
                    : "inherit";

                return (
                  <div
                    key={permission.key}
                    style={{
                      border: `1px solid ${colors.border}`,
                      borderRadius: radius.components.card,
                      padding: "12px 14px",
                      backgroundColor: colors.surface,
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <div style={{ fontWeight: typography.weights.semibold, color: colors.text.primary }}>
                      {permission.label}
                    </div>
                    <select
                      value={mode}
                      onChange={(event) => {
                        const nextMode = event.target.value;
                        setSalesAllowPermissions((current) =>
                          nextMode === "allow"
                            ? Array.from(new Set([...current, permission.key]))
                            : current.filter((entry) => entry !== permission.key),
                        );
                        setSalesDenyPermissions((current) =>
                          nextMode === "deny"
                            ? Array.from(new Set([...current, permission.key]))
                            : current.filter((entry) => entry !== permission.key),
                        );
                      }}
                      style={selectStyle}
                    >
                      <option value="inherit">Inherit Role Default</option>
                      <option value="allow">Allow for This User</option>
                      <option value="deny">Deny for This User</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}
