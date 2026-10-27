"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Eye, Pencil, Save } from "lucide-react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";
import type { Role, User } from "@/features/administration/types";

const salesChannelPermissions = [
  { key: "sales.factory.use", label: "Factory Sales" },
  { key: "sales.branch.use", label: "Branch Sales" },
  { key: "sales.truck.use", label: "Truck Sales" },
  { key: "sales.agent.use", label: "Agent Sales" },
] as const;

const loadingPermissions = [
  { key: "sales.loading.create", label: "Create Loading" },
  { key: "sales.loading.confirm", label: "Confirm Loading" },
  { key: "sales.loading.cancel", label: "Cancel Loading" },
] as const;

const userOverridePermissions = [...salesChannelPermissions, ...loadingPermissions];

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: 24,
  background: "#f8fafc",
};

const iconActionLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: "#ffffff",
  color: colors.text.primary,
  textDecoration: "none",
};

const iconActionButtonStyle: React.CSSProperties = {
  ...iconActionLinkStyle,
  cursor: "pointer",
};

const roleGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 16,
};

const matrixStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
};

function hasPermission(role: Role, key: string) {
  return role.permissions.includes(key) || role.permissions.includes("*");
}

function summarizeUserSalesScope(user: User) {
  const allowed = user.salesAllowPermissions ?? [];
  const denied = user.salesDenyPermissions ?? [];

  if (!allowed.length && !denied.length) {
    return "Role default only";
  }

  const parts: string[] = [];
  if (allowed.length) {
    parts.push(`Allow: ${allowed.length}`);
  }
  if (denied.length) {
    parts.push(`Deny: ${denied.length}`);
  }
  return parts.join(" | ");
}

function getUserPermissionOverride(user: User, permission: string) {
  if ((user.salesAllowPermissions ?? []).includes(permission)) {
    return "allow";
  }
  if ((user.salesDenyPermissions ?? []).includes(permission)) {
    return "deny";
  }
  return "inherit";
}

export function SalesPoliciesPage({
  roles,
  users,
}: {
  roles: Role[];
  users: User[];
}) {
  const [roleState, setRoleState] = useState(roles);
  const [userState, setUserState] = useState(users);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const roleMap = useMemo(() => new Map(roleState.map((role) => [role.name, role])), [roleState]);

  function toggleRolePermission(roleId: string, permission: string) {
    setRoleState((current) =>
      current.map((role) =>
        role.id !== roleId
          ? role
          : {
              ...role,
              permissions: role.permissions.includes(permission)
                ? role.permissions.filter((entry) => entry !== permission)
                : [...role.permissions, permission],
            },
      ),
    );
  }

  function saveRole(role: Role) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/administration/roles/${role.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: role.name,
          description: role.description,
          isActive: role.isActive,
          permissions: role.permissions,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? `Failed to save ${role.name}`);
        return;
      }
      setMessage(`Saved sales policy changes for ${role.name}.`);
    });
  }

  function setUserOverride(userId: string, permission: string, mode: "inherit" | "allow" | "deny") {
    setUserState((current) =>
      current.map((user) => {
        if (user.id !== userId) {
          return user;
        }

        const allow = new Set(user.salesAllowPermissions ?? []);
        const deny = new Set(user.salesDenyPermissions ?? []);
        allow.delete(permission);
        deny.delete(permission);

        if (mode === "allow") {
          allow.add(permission);
        } else if (mode === "deny") {
          deny.add(permission);
        }

        const rolePermissions = roleMap.get(user.role)?.permissions ?? [];
        const nextPermissions = rolePermissions.includes("*")
          ? ["*"]
          : Array.from(new Set([...rolePermissions, ...allow])).filter((entry) => !deny.has(entry));

        return {
          ...user,
          permissions: nextPermissions,
          salesAllowPermissions: Array.from(allow).sort(),
          salesDenyPermissions: Array.from(deny).sort(),
        };
      }),
    );
  }

  function saveUserOverrides(user: User) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/administration/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          username: user.username ?? null,
          phone: user.phone ?? "",
          isActive: user.isActive,
          defaultLocationId: user.defaultLocationId ?? null,
          accessibleLocationIds: user.accessibleLocationIds ?? [],
          salesAllowPermissions: user.salesAllowPermissions ?? [],
          salesDenyPermissions: user.salesDenyPermissions ?? [],
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(payload?.error ?? `Failed to save overrides for ${user.name}`);
        return;
      }
      setMessage(`Saved sales overrides for ${user.name}.`);
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Sales Policies"
        subtitle="Manage sales channel access visually by role, then adjust per-user overrides and location scope in the same place."
        breadcrumbs={[
          { label: "Administration", href: "/administration" },
          { label: "Sales Policies" },
        ]}
      />

      {message ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 14,
            background: "#ecfdf3",
            color: "#027a48",
            border: "1px solid #86efac",
            fontWeight: 600,
          }}
        >
          {message}
        </div>
      ) : null}

      <FormCard title="Role Channel Matrix" variant="teal-header">
        <div style={roleGridStyle}>
          {roleState.map((role) => (
            <div
              key={role.id}
              style={{
                border: "1px solid #e4e7ec",
                borderRadius: 18,
                background: "#fff",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: colors.text.primary }}>{role.name}</div>
                <div style={{ marginTop: 6, color: colors.text.secondary }}>{role.description || "No description"}</div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                  Sales Channels
                </div>
                <div style={matrixStyle}>
                  {salesChannelPermissions.map((permission) => (
                    <label key={permission.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasPermission(role, permission.key)}
                        disabled={role.isSystem}
                        onChange={() => toggleRolePermission(role.id, permission.key)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: colors.text.secondary, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>
                  Loading Actions
                </div>
                <div style={matrixStyle}>
                  {loadingPermissions.map((permission) => (
                    <label key={permission.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        checked={hasPermission(role, permission.key)}
                        disabled={role.isSystem}
                        onChange={() => toggleRolePermission(role.id, permission.key)}
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
                <Link href={publicViewUrl("administration.role", role.publicId)} style={{ color: colors.primary[700], fontWeight: 700 }}>
                  View Role
                </Link>
                <ActionButtons
                  actions={[
                    {
                      label: "Save Policy",
                      variant: "primary",
                      onClick: () => saveRole(role),
                      loading: isPending,
                    },
                  ]}
                />
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      <FormCard title="User Location Scope And Overrides" variant="teal-header">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1500, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                {["User", "Role", "Assigned Locations", "Effective Channel Scope", "Per-User Overrides", "Actions"].map((label) => (
                  <th key={label} style={{ padding: "12px 10px", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {userState.map((user) => {
                const channelScope = salesChannelPermissions
                  .filter((permission) => user.permissions.includes(permission.key) || user.permissions.includes("*"))
                  .map((permission) => permission.label);

                return (
                  <tr key={user.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 700 }}>{user.name}</div>
                      <div style={{ color: colors.text.secondary, fontSize: 13 }}>{user.email}</div>
                    </td>
                    <td style={{ padding: "14px 10px", verticalAlign: "top" }}>{user.role || "-"}</td>
                    <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                      {user.locations.length ? user.locations.join(", ") : "No assigned locations"}
                    </td>
                    <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                      {channelScope.length ? channelScope.join(", ") : "Inherited / unrestricted"}
                    </td>
                    <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                      <div style={{ minWidth: 460, display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 12, color: colors.text.secondary, fontWeight: 700 }}>
                          {summarizeUserSalesScope(user)}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                          {userOverridePermissions.map((permission) => (
                            <label key={permission.key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: colors.text.secondary }}>{permission.label}</span>
                              <select
                                value={getUserPermissionOverride(user, permission.key)}
                                onChange={(event) =>
                                  setUserOverride(
                                    user.id,
                                    permission.key,
                                    event.target.value as "inherit" | "allow" | "deny",
                                  )
                                }
                                style={{
                                  border: "1px solid #d0d5dd",
                                  borderRadius: 10,
                                  minHeight: 38,
                                  padding: "0 10px",
                                  background: "#fff",
                                }}
                              >
                                <option value="inherit">Inherit role</option>
                                <option value="allow">Allow user</option>
                                <option value="deny">Deny user</option>
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 10px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link href={publicViewUrl("administration.user", user.publicId)} style={iconActionLinkStyle} title="View user" aria-label="View user">
                          <Eye size={16} />
                        </Link>
                        <Link href={publicEditUrl("administration.user", user.publicId)} style={iconActionLinkStyle} title="Edit user" aria-label="Edit user">
                          <Pencil size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => saveUserOverrides(user)}
                          style={iconActionButtonStyle}
                          title="Save overrides"
                          aria-label="Save overrides"
                        >
                          <Save size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </FormCard>
    </div>
  );
}
