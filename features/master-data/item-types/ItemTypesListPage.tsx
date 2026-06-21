"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  DataTable,
  StatusBadge,
  EmptyState,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { ItemType } from "../types";
import { colors } from "@/components/ui/colors";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { spacing } from "@/components/ui/spacing";
import { deleteRecord } from "@/lib/client/record-actions";

export interface ItemTypesListPageProps {
  initialData?: ItemType[];
}

export default function ItemTypesListPage({
  initialData = [],
}: ItemTypesListPageProps) {
  const router = useRouter();
  const [data] = useState<ItemType[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Item Types" },
  ];

  const columns: Column<ItemType>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "code", label: "Code", sortable: true },
    {
      key: "description",
      label: "Description",
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
      onClick: (record) => router.push(`/master-data/item-types/${record.id}`),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(`/master-data/item-types/${record.id}/edit`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/master-data/item-types/${record.id}`,
            "item type",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(
            error instanceof Error ? error.message : "Failed to delete item type",
          );
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Item Types Found"
      message="There are no item types to display. Create your first item type to get started."
      action={{
        label: "Create Item Type",
        onClick: () => router.push(window.location.pathname + "/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Item Type",
      variant: "primary",
      onClick: () => router.push(window.location.pathname + "/create"),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Item Types"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
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
