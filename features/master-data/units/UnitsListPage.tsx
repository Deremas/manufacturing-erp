"use client";

import React, { useMemo, useState } from "react";
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
import type { Unit } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2, Ruler } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface UnitsListPageProps {
  initialData?: Unit[];
}

export default function UnitsListPage({ initialData = [] }: UnitsListPageProps) {
  const router = useRouter();
  const [data] = useState<Unit[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Units" },
  ];

  const typeOptions = useMemo(
    () => Array.from(new Set(data.map((unit) => unit.type))).map((type) => ({ label: type, value: type })),
    [data],
  );

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name or abbreviation...",
    },
    {
      type: "select",
      key: "type",
      label: "Type",
      placeholder: "All Types",
      options: typeOptions,
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

  const columns: Column<Unit>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "abbreviation", label: "Abbreviation", sortable: true },
    { key: "type", label: "Type", sortable: true },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const tableActions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(`/master-data/units/${record.id}`) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(`/master-data/units/${record.id}/edit`) },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(`/api/records/master-data/units/${record.id}`, "unit");
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(error instanceof Error ? error.message : "Failed to delete unit");
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Ruler size={36} />}
      title="No Units Found"
      message="There are no units of measure to display. Create your first unit to get started."
      action={{
        label: "Create Unit",
        onClick: () => router.push(window.location.pathname + "/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Unit",
      variant: "primary",
      onClick: () => router.push(window.location.pathname + "/create"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Units"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard title="Filter Units" fields={filterFields} onFilter={handleFilter} onReset={() => undefined} />

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
