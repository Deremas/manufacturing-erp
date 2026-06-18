"use client";

import React, { useState } from "react";
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

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockRoles: Role[] = [
  {
    id: "role-1",
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: [
      "procurement.view",
      "procurement.create",
      "procurement.edit",
      "procurement.delete",
      "procurement.approve",
      "inventory.view",
      "inventory.create",
      "inventory.edit",
      "inventory.delete",
      "production.view",
      "sales.view",
      "finance.view",
      "reports.view",
      "administration.view",
    ],
    isActive: true,
  },
  {
    id: "role-2",
    name: "Procurement Manager",
    description: "Manage purchase orders and supplier relations",
    permissions: [
      "procurement.view",
      "procurement.create",
      "procurement.edit",
      "procurement.approve",
      "inventory.view",
      "reports.view",
    ],
    isActive: true,
  },
  {
    id: "role-3",
    name: "Warehouse Operator",
    description: "Handle inventory and stock movements",
    permissions: [
      "inventory.view",
      "inventory.create",
      "inventory.edit",
      "production.view",
    ],
    isActive: true,
  },
  {
    id: "role-4",
    name: "Sales Representative",
    description: "Manage sales orders and customer accounts",
    permissions: [
      "sales.view",
      "sales.create",
      "sales.edit",
      "inventory.view",
      "reports.view",
    ],
    isActive: true,
  },
  {
    id: "role-5",
    name: "Finance Officer",
    description: "Handle financial records and transactions",
    permissions: [
      "finance.view",
      "finance.create",
      "finance.edit",
      "finance.approve",
      "reports.view",
    ],
    isActive: false,
  },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function RolesPage() {
  const [data] = useState<Role[]>(mockRoles);

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
    { key: "name", label: "Name", sortable: true },
    {
      key: "description",
      label: "Description",
      render: (value) => (value ? (value as string) : "—"),
    },
    {
      key: "permissions",
      label: "Permissions Count",
      sortable: true,
      render: (value) => {
        const count = (value as string[]).length;
        return (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                backgroundColor: colors.primary[100],
                color: colors.primary[700],
                fontWeight: 600,
                fontSize: "12px",
              }}
            >
              {count}
            </span>
            <span style={{ color: colors.text.secondary, fontSize: "13px" }}>
              {count === 1 ? "permission" : "permissions"}
            </span>
          </span>
        );
      },
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
      onClick: (record) => console.log("View role", record.id),
    },
    {
      label: "Edit",
      onClick: (record) => console.log("Edit role", record.id),
    },
    {
      label: "Delete",
      color: colors.danger[600],
      onClick: (record) => console.log("Delete role", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Roles Found"
      message="There are no roles to display. Create a new role to get started."
      action={{
        label: "Create Role",
        onClick: () => console.log("Create Role"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Role",
      variant: "primary",
      onClick: () => console.log("Create Role"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    console.log("Filters reset");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Roles"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

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
