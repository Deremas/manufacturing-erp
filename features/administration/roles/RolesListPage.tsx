"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
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
import type { Role } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2, Shield } from "lucide-react";

export interface RolesListPageProps {
  initialData?: Role[];
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

export default function RolesListPage({
  initialData = [],
}: RolesListPageProps) {
  const router = useRouter();
  const [data, setData] = useState<Role[]>(initialData);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Roles" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name or description...",
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
  ];

  const columns: Column<Role>[] = [
    { key: "name", label: "Role Name", sortable: true },
    {
      key: "description",
      label: "Description",
      render: (value) => (value ? (value as string) : "—"),
    },
    {
      key: "permissionsCount",
      label: "Permissions",
      render: (value, record) => {
        const count = Number(value ?? record.permissions?.length ?? 0);
        return (
          <span style={{ fontWeight: 600, color: colors.text.primary }}>
            {count}
          </span>
        );
      },
    },
    {
      key: "usersCount",
      label: "Users",
      render: (value) => (
        <span style={{ fontWeight: 600, color: colors.text.primary }}>
          {Number(value ?? 0)}
        </span>
      ),
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(`/administration/roles/${record.id}`),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(`/administration/roles/${record.id}/edit`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        if (record.isSystem) {
          window.alert("System roles cannot be deleted.");
          return;
        }

        const confirmed = window.confirm(
          `Delete role "${record.name}"? This will archive the role.`,
        );
        if (!confirmed) return;

        const response = await fetch(`/api/administration/roles/${record.id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setData((prev) => prev.filter((role) => role.id !== record.id));
          return;
        }

        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        window.alert(payload?.error ?? "Failed to delete role");
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Shield size={36} />}
      title="No Roles Found"
      message="There are no roles to display. Create a new role to get started."
      action={{
        label: "Create Role",
        onClick: () => router.push("/administration/roles/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Role",
      variant: "primary",
      onClick: () => router.push("/administration/roles/create"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => console.log("Filters reset");

  const totalRoles = data.length;
  const activeRoles = data.filter((role) => role.isActive).length;
  const inactiveRoles = data.filter((role) => !role.isActive).length;
  const systemRoles = data.filter(
    (role) => role.isSystem,
  ).length;

  const metrics = useMemo(
    () => [
      { label: "Total Roles", value: totalRoles },
      { label: "Active Roles", value: activeRoles },
      { label: "Inactive Roles", value: inactiveRoles },
      { label: "System Roles", value: systemRoles },
    ],
    [activeRoles, inactiveRoles, systemRoles, totalRoles],
  );

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Roles"
        subtitle="Manage system roles and permissions."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
        }}
      >
        {metrics.map((metric) => (
          <div
              key={metric.label}
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 16,
              padding: "20px 22px",
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: colors.text.secondary,
              }}
            >
              {metric.label}
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 700,
                color: colors.text.primary,
              }}
            >
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <FilterCard
        title="Filter Roles"
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
