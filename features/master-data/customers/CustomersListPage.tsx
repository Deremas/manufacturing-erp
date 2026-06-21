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
import type { Customer } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2, Users, UserCheck, UserX } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface CustomersListPageProps {
  initialData?: Customer[];
}

export default function CustomersListPage({
  initialData = [],
}: CustomersListPageProps) {
  const router = useRouter();
  const [data] = useState<Customer[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Customers" },
  ];

  const paymentTermOptions = useMemo(
    () =>
      Array.from(new Set(data.map((customer) => customer.paymentTerms).filter(Boolean))).map((value) => ({
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
      placeholder: "Search by name, code, or email...",
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

  const columns: Column<Customer>[] = [
    { key: "customerCode", label: "Code", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "phone", label: "Phone", render: (value) => value ?? "—" },
    { key: "email", label: "Email", render: (value) => value ?? "—" },
    {
      key: "creditLimit",
      label: "Credit Limit",
      sortable: true,
      render: (value) =>
        `ETB ${(value as number).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
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
      onClick: (record) => router.push(`/master-data/customers/${record.id}`),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) =>
        router.push(`/master-data/customers/${record.id}/edit`),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/master-data/customers/${record.id}`,
            "customer",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(
            error instanceof Error ? error.message : "Failed to delete customer",
          );
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Users size={36} />}
      title="No Customers Found"
      message="There are no customers to display. Create your first customer to get started."
      action={{
        label: "Create Customer",
        onClick: () => router.push(window.location.pathname + "/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Customer",
      variant: "primary",
      onClick: () => router.push(window.location.pathname + "/create"),
    },
  ];

  const totalCustomers = data.length;
  const activeCustomers = data.filter((c) => c.isActive).length;
  const inactiveCustomers = data.filter((c) => !c.isActive).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Customers"
        subtitle="Manage customer accounts, credit limits, and payment terms."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "16px" }}>
        <MetricCard label="Total Customers" value={totalCustomers} icon={<Users size={20} />} color={colors.primary[600]} borderColor={colors.primary[500]} />
        <MetricCard label="Active Customers" value={activeCustomers} icon={<UserCheck size={20} />} color={colors.success[600]} borderColor={colors.success[500]} />
        <MetricCard label="Inactive Customers" value={inactiveCustomers} icon={<UserX size={20} />} color={colors.danger[600]} borderColor={colors.danger[500]} />
      </div>

      <FilterCard title="Filter Customers" fields={filterFields} onFilter={(values) => console.log("Filter values", values)} onReset={() => undefined} />

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
