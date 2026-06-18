"use client";

import React, { useState } from "react";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  SearchInput,
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

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockUsers: User[] = [
  {
    id: "usr-1",
    name: "John Doe",
    email: "john.doe@konel.com",
    role: "Administrator",
    phone: "+1-555-0101",
    avatar: "",
    isActive: true,
    permissions: ["all"],
    locations: ["Main Warehouse", "Factory 1"],
    createdAt: "2025-01-15T08:00:00Z",
  },
  {
    id: "usr-2",
    name: "Jane Smith",
    email: "jane.smith@konel.com",
    role: "Procurement Manager",
    phone: "+1-555-0102",
    avatar: "",
    isActive: true,
    permissions: ["procurement.*", "inventory.view"],
    locations: ["Main Warehouse"],
    createdAt: "2025-02-01T08:00:00Z",
  },
  {
    id: "usr-3",
    name: "Bob Johnson",
    email: "bob.johnson@konel.com",
    role: "Warehouse Operator",
    phone: "+1-555-0103",
    avatar: "",
    isActive: true,
    permissions: ["inventory.*", "production.view"],
    locations: ["Factory 1", "Factory 2"],
    createdAt: "2025-03-10T08:00:00Z",
  },
  {
    id: "usr-4",
    name: "Alice Williams",
    email: "alice.williams@konel.com",
    role: "Sales Representative",
    phone: "+1-555-0104",
    avatar: "",
    isActive: true,
    permissions: ["sales.*", "reports.sales"],
    locations: ["Sales Office"],
    createdAt: "2025-04-05T08:00:00Z",
  },
  {
    id: "usr-5",
    name: "Charlie Brown",
    email: "charlie.brown@konel.com",
    role: "Finance Officer",
    phone: "+1-555-0105",
    avatar: "",
    isActive: false,
    permissions: ["finance.*", "reports.finance"],
    locations: ["Head Office"],
    createdAt: "2025-05-20T08:00:00Z",
  },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function UsersPage() {
  const [data] = useState<User[]>(mockUsers);
  const [search, setSearch] = useState("");

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
      options: [
        { label: "Administrator", value: "Administrator" },
        { label: "Procurement Manager", value: "Procurement Manager" },
        { label: "Warehouse Operator", value: "Warehouse Operator" },
        { label: "Sales Representative", value: "Sales Representative" },
        { label: "Finance Officer", value: "Finance Officer" },
      ],
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
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span>{value as string}</span>
          </div>
        </div>
      ),
    },
    { key: "email", label: "Email", sortable: true },
    {
      key: "role",
      label: "Role",
      sortable: true,
    },
    {
      key: "phone",
      label: "Phone",
      render: (value) => (value ? (value as string) : "—"),
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value) =>
        new Date(value as string).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      onClick: (record) => console.log("View user", record.id),
    },
    {
      label: "Edit",
      onClick: (record) => console.log("Edit user", record.id),
    },
    {
      label: "Delete",
      color: colors.danger[600],
      onClick: (record) => console.log("Delete user", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Users Found"
      message="There are no users to display. Create a new user to get started."
      action={{
        label: "Create User",
        onClick: () => console.log("Create User"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create User",
      variant: "primary",
      onClick: () => console.log("Create User"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    setSearch("");
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
        title="Users"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Users"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, email, or phone..."
        />
      </div>

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
