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
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";

export interface UnitsListPageProps {
  initialData?: Unit[];
}

export default function UnitsListPage({ initialData = [] }: UnitsListPageProps) {
  const router = useRouter();
  const [data] = useState<Unit[]>(initialData);
  const [filters, setFilters] = useState<Record<string, string>>({});

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Units" },
  ];

  const typeOptions = useMemo(
    () => Array.from(new Set(data.map((unit) => unit.type))).map((type) => ({ label: type, value: type })),
    [data],
  );

  const filteredData = useMemo(() => {
    const search = filters.search?.trim().toLowerCase() ?? "";
    const type = filters.type?.trim() ?? "";
    const status = filters.status?.trim() ?? "";

    return data.filter((unit) => {
      if (type && unit.type !== type) return false;
      if (status && String(unit.isActive) !== status) return false;
      if (!search) return true;

      return [unit.code, unit.name, unit.abbreviation, unit.type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });
  }, [data, filters]);

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
    { key: "code", label: "Code", sortable: true, render: (value, record) => String(value || record.abbreviation || "").toUpperCase() },
    { key: "name", label: "Name", sortable: true },
    { key: "abbreviation", label: "Abbreviation", sortable: true, render: (value) => String(value ?? "").toUpperCase() },
    { key: "type", label: "Type", sortable: true },
    { key: "decimalPrecision", label: "Decimal Precision", sortable: true, render: (value) => Number(value ?? 0).toString() },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const tableActions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(publicViewUrl("master-data.unit", record.publicId)) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(publicEditUrl("master-data.unit", record.publicId)) },
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
        onClick: () => router.push("/master-data/units/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Unit",
      variant: "primary",
      onClick: () => router.push("/master-data/units/create"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Units"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Units"
        fields={filterFields}
        onFilter={setFilters}
        onReset={() => setFilters({})}
      />

      <DataTable
        columns={columns}
        data={filteredData}
        actions={tableActions}
        emptyState={emptyState}
        recordCount={filteredData.length}
      />
    </div>
  );
}
