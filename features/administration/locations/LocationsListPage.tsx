"use client";

import React, { useMemo, useState } from "react";
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
import type { Location } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { LocationTypes } from "@/lib/constants";
import {
  Eye,
  Pencil,
  Trash2,
  MapPin,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface LocationsListPageProps {
  initialData?: Location[];
}

export default function LocationsListPage({
  initialData = [],
}: LocationsListPageProps) {
  const router = useRouter();
  const [data] = useState<Location[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Locations" },
  ];

  const locationTypeOptions = useMemo(
    () => LocationTypes.map((value) => ({ label: value, value })),
    [],
  );

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by code, name, or address...",
    },
    {
      type: "select",
      key: "type",
      label: "Type",
      placeholder: "All Types",
      options: locationTypeOptions,
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

  const columns: Column<Location>[] = [
    { key: "locationCode", label: "Code", sortable: true },
    { key: "locationName", label: "Name", sortable: true },
    {
      key: "locationType",
      label: "Type",
      sortable: true,
      render: (value) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: "6px",
            backgroundColor: colors.primary[50],
            color: colors.primary[700],
            fontFamily: typography.fontFamily,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: typography.weights.medium,
          }}
        >
          {value as string}
        </span>
      ),
    },
    {
      key: "address",
      label: "Address",
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
      icon: <Eye size={16} />,
      onClick: (record) => router.push(`/administration/locations/${record.id}`),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(`/administration/locations/${record.id}/edit`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/administration/locations/${record.id}`,
            "location",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(
            error instanceof Error ? error.message : "Failed to delete location",
          );
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<MapPin size={36} />}
      title="No Locations Found"
      message="There are no locations to display. Create your first location to get started."
      action={{
        label: "Create Location",
        onClick: () => router.push("/administration/locations/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Location",
      variant: "primary",
      onClick: () => router.push("/administration/locations/create"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const totalLocations = data.length;
  const activeLocations = data.filter((location) => location.isActive).length;
  const inactiveLocations = data.filter((location) => !location.isActive).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Locations"
        subtitle="Manage all organizational locations including warehouses, stores, plants, and offices."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "16px",
        }}
      >
        <MetricCard
          label="Total Locations"
          value={totalLocations}
          icon={<MapPin size={18} />}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Active"
          value={activeLocations}
          icon={<CheckCircle size={18} />}
          borderColor={colors.success[500]}
          color={colors.success[700]}
        />
        <MetricCard
          label="Inactive"
          value={inactiveLocations}
          icon={<XCircle size={18} />}
          borderColor={colors.danger[500]}
          color={colors.danger[700]}
        />
      </div>

      <FilterCard
        title="Filter Locations"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={() => undefined}
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
