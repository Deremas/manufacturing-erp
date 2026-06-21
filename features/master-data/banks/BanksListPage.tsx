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
import type { Breadcrumb, Column, TableAction, Action } from "@/components/shared";
import type { Bank } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2, Landmark } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface BanksListPageProps {
  initialData?: Bank[];
}

export default function BanksListPage({ initialData = [] }: BanksListPageProps) {
  const router = useRouter();
  const [data] = useState<Bank[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Banks" },
  ];

  const handleCreate = () => router.push(window.location.pathname + "/create");

  const columns: Column<Bank>[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "shortName", label: "Short Name", sortable: true },
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
      onClick: (record) => router.push(window.location.pathname + "/" + record.id),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(window.location.pathname + "/" + record.id + "/edit"),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(`/api/records/master-data/banks/${record.id}`, "bank");
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(error instanceof Error ? error.message : "Failed to delete bank");
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Landmark size={36} />}
      title="No Banks Found"
      message="There are no banks to display. Create your first bank to get started."
      action={{ label: "Create Bank", onClick: handleCreate }}
    />
  );

  const pageActions: Action[] = [
    { label: "Create Bank", variant: "primary", onClick: handleCreate },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Banks"
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
