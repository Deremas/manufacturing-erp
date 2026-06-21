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
import type { Supplier } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2, Truck, UserCheck, UserX } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface SuppliersListPageProps {
  initialData?: Supplier[];
}

export default function SuppliersListPage({
  initialData = [],
}: SuppliersListPageProps) {
  const router = useRouter();
  const [data] = useState<Supplier[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Suppliers" },
  ];

  const paymentTermOptions = useMemo(
    () =>
      Array.from(new Set(data.map((supplier) => supplier.paymentTerms).filter(Boolean))).map((value) => ({
        label: String(value),
        value: String(value),
      })),
    [data],
  );

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by name, code, or contact...",
    },
    {
      type: "select",
      key: "paymentTerms",
      label: "Payment Terms",
      placeholder: "All Terms",
      options: paymentTermOptions,
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

  const columns: Column<Supplier>[] = [
    { key: "supplierCode", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    {
      key: "contactPerson",
      label: "Contact Person",
      render: (value) => value ?? "—",
    },
    { key: "phone", label: "Phone", render: (value) => value ?? "—" },
    { key: "email", label: "Email", render: (value) => value ?? "—" },
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
      onClick: (record) => router.push(`/master-data/suppliers/${record.id}`),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(`/master-data/suppliers/${record.id}/edit`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/master-data/suppliers/${record.id}`,
            "supplier",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(
            error instanceof Error ? error.message : "Failed to delete supplier",
          );
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Truck size={36} />}
      title="No Suppliers Found"
      message="There are no suppliers to display. Create your first supplier to get started."
      action={{
        label: "Create Supplier",
        onClick: () => router.push(window.location.pathname + "/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Supplier",
      variant: "primary",
      onClick: () => router.push(window.location.pathname + "/create"),
    },
  ];

  const totalSuppliers = data.length;
  const activeSuppliers = data.filter((s) => s.isActive).length;
  const inactiveSuppliers = data.filter((s) => !s.isActive).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Suppliers"
        subtitle="Manage supplier accounts, contact information, and payment terms."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
        <MetricCard label="Total Suppliers" value={totalSuppliers} icon={<Truck size={20} />} color={colors.primary[600]} borderColor={colors.primary[500]} />
        <MetricCard label="Active Suppliers" value={activeSuppliers} icon={<UserCheck size={20} />} color={colors.success[600]} borderColor={colors.success[500]} />
        <MetricCard label="Inactive Suppliers" value={inactiveSuppliers} icon={<UserX size={20} />} color={colors.danger[600]} borderColor={colors.danger[500]} />
      </div>

      <FilterCard title="Filter Suppliers" fields={filterFields} onFilter={(values) => console.log("Filter values", values)} onReset={() => undefined} />

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
