"use client";

import React, { useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { User as UserType } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Eye, EyeOff, UserIcon, ShieldCheck, Save, X } from "lucide-react";

export interface OptionItem {
  label: string;
  value: string;
}

export interface UserFormPageProps {
  initialData?: UserType;
  isCreating?: boolean;
  roles?: OptionItem[];
  locations?: OptionItem[];
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
  height: "48px",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
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

export default function UserFormPage({
  initialData,
  isCreating = true,
  roles = [],
  locations = [],
}: UserFormPageProps) {
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

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Users", href: "/administration/users" },
    { label: isCreating ? "Create User" : "Edit User" },
  ];

  const handleSave = () => {
    console.log("Save user", {
      fullName,
      username,
      email,
      phone,
      password: password.trim() ? password : undefined,
      roleId,
      defaultLocationId,
      accessibleLocationIds,
      status,
    });
  };

  const handleCancel = () => {
    console.log("Cancel");
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: handleCancel,
    },
    {
      label: "Save",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSave,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isCreating ? "Create User" : "Edit User"}
        breadcrumbs={breadcrumbs}
      />

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
                <option value="">Select Role</option>
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
                <option value="">Select Location</option>
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
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}
