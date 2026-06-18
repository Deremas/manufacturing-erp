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
import type { Department } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockDepartments: Department[] = [
  {
    id: "dept-1",
    name: "Production",
    code: "PROD",
    managerId: "emp-001",
    managerName: "David Wilson",
    isActive: true,
  },
  {
    id: "dept-2",
    name: "Procurement",
    code: "PROC",
    managerId: "emp-002",
    managerName: "Jennifer Adams",
    isActive: true,
  },
  {
    id: "dept-3",
    name: "Sales & Marketing",
    code: "SALES",
    managerId: "emp-003",
    managerName: "Robert Taylor",
    isActive: true,
  },
  {
    id: "dept-4",
    name: "Finance",
    code: "FIN",
    managerId: "emp-004",
    managerName: "Susan Clark",
    isActive: true,
  },
  {
    id: "dept-5",
    name: "Human Resources",
    code: "HR",
    managerId: "emp-005",
    managerName: "Amanda Lee",
    isActive: true,
  },
  {
    id: "dept-6",
    name: "Warehouse",
    code: "WH",
    isActive: false,
  },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function DepartmentsPage() {
  const [data] = useState<Department[]>(mockDepartments);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Departments" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name or code...",
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

  const columns: Column<Department>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "code", label: "Code", sortable: true },
    {
      key: "managerName",
      label: "Manager",
      render: (value) => value ?? "—",
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
      onClick: (record) => console.log("View", record.id),
    },
    {
      label: "Edit",
      onClick: (record) => console.log("Edit", record.id),
    },
    {
      label: "Delete",
      color: colors.danger[600],
      onClick: (record) => console.log("Delete", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Departments Found"
      message="There are no departments to display. Create your first department to get started."
      action={{
        label: "Create Department",
        onClick: () => console.log("Create Department"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export departments"),
    },
    {
      label: "Create Department",
      variant: "primary",
      onClick: () => console.log("Create Department"),
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
        title="Departments"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Departments"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name or code..."
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
