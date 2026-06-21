"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  ActionButtons,
} from "@/components/shared";
import type { Breadcrumb, FilterField, Column, TableAction, Action } from "@/components/shared";
import type { Department } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2, Building2 } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface DepartmentsListPageProps {
  initialData?: Department[];
}

export default function DepartmentsListPage({
  initialData = [],
}: DepartmentsListPageProps) {
  const router = useRouter();
  const [data] = useState<Department[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Departments" },
  ];

  const filterFields: FilterField[] = [
    { type: "text", key: "search", label: "Search", placeholder: "Search by name or code..." },
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
    { key: "managerName", label: "Manager", render: (value) => value ?? "—" },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const handleCreate = () => router.push(window.location.pathname + "/create");

  const tableActions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(window.location.pathname + "/" + record.id) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(window.location.pathname + "/" + record.id + "/edit") },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/master-data/departments/${record.id}`,
            "department",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(
            error instanceof Error ? error.message : "Failed to delete department",
          );
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Building2 size={36} />}
      title="No Departments Found"
      message="There are no departments to display. Create your first department to get started."
      action={{ label: "Create Department", onClick: handleCreate }}
    />
  );

  const pageActions: Action[] = [
    { label: "Create Department", variant: "primary", onClick: handleCreate },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Departments"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard title="Filter Departments" fields={filterFields} onFilter={(values) => console.log("Filter values", values)} onReset={() => undefined} />

      <DataTable columns={columns} data={data} actions={tableActions} emptyState={emptyState} recordCount={data.length} />
    </div>
  );
}
