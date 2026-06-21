"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  MetricCard,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  FilterField,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { User } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import {
  Eye,
  Pencil,
  Trash2,
  KeyRound,
  Users,
  UserCheck,
  UserX,
  Shield,
} from "lucide-react";

export interface UsersListPageProps {
  initialData?: User[];
  currentUserId?: string | null;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const metricsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: "16px",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function UsersListPage({
  initialData = [],
  currentUserId,
}: UsersListPageProps) {
  const router = useRouter();
  const [data, setData] = useState<User[]>(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Users" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name, email, or phone...",
    },
    {
      type: "select",
      key: "role",
      label: "Role",
      placeholder: "All Roles",
      options: Array.from(
        new Set(data.map((user) => user.role).filter(Boolean)),
      ).map((role) => ({
        label: role,
        value: role,
      })),
    },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
    {
      type: "select",
      key: "location",
      label: "Location",
      placeholder: "All Locations",
      options: Array.from(
        new Set(data.flatMap((user) => user.locations ?? [])),
      ).map((location) => ({ label: location, value: location })),
    },
  ];

  const columns: Column<User>[] = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (value, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: colors.primary[100],
              color: colors.primary[700],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            {(record.name as string)
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)}
          </div>
          <span>{value as string}</span>
        </div>
      ),
    },
    { key: "email", label: "Email", sortable: true },
    { key: "role", label: "Role", sortable: true },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
    {
      key: "lastLogin",
      label: "Last Login",
      sortable: true,
      render: (value) =>
        value
          ? new Date(value as string).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—",
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(`/administration/users/${record.id}`),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(`/administration/users/${record.id}/edit`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        const isSystemUser = Boolean(
          record.isSystem ||
            String(record.role ?? "").toLowerCase().includes("super admin"),
        );
        if (isSystemUser) {
          window.alert("System users cannot be deleted.");
          return;
        }

        if (currentUserId && record.id === currentUserId) {
          window.alert("You cannot delete your own user account.");
          return;
        }

        const confirmed = window.confirm(
          `Delete user "${record.name}"? This will archive the user.`,
        );
        if (!confirmed) return;

        const response = await fetch(
          `/api/records/administration/users/${record.id}`,
          { method: "DELETE" },
        );

        if (response.ok) {
          setData((prev) => prev.filter((user) => user.id !== record.id));
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        window.alert(payload?.error ?? "Failed to delete user");
      },
    },
    {
      label: "Reset Password",
      icon: <KeyRound size={16} />,
      onClick: (record) => console.log("Reset password", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Users size={36} />}
      title="No Users Found"
      message="There are no users to display. Create a new user to get started."
      action={{
        label: "Create User",
        onClick: () => router.push("/administration/users/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create User",
      variant: "primary",
      onClick: () => router.push("/administration/users/create"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    console.log("Filters reset");
  };

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Users"
        subtitle="Manage system users, roles, and access."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={metricsRowStyle}>
        <MetricCard
          label="Total Users"
          value={data.length}
          icon={<Users size={20} />}
          color={colors.primary[600]}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Active Users"
          value={data.filter((u) => u.isActive).length}
          icon={<UserCheck size={20} />}
          color={colors.success[600]}
          borderColor={colors.success[500]}
        />
        <MetricCard
          label="Inactive Users"
          value={data.filter((u) => !u.isActive).length}
          icon={<UserX size={20} />}
          color={colors.danger[600]}
          borderColor={colors.danger[500]}
        />
        <MetricCard
          label="Administrators"
          value={data.filter((u) => String(u.role ?? "").toLowerCase().includes("admin")).length}
          icon={<Shield size={20} />}
          color={colors.warning[600]}
          borderColor={colors.warning[500]}
        />
      </div>

      <FilterCard
        title="Filter Users"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={data}
        actions={tableActions}
        emptyState={emptyState}
        recordCount={data.length}
      />
    </div>
  );
}
