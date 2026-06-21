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
import type { BankAccount } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { Eye, Pencil, Trash2, CreditCard, CheckCircle, XCircle } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface BankAccountsListPageProps {
  initialData?: BankAccount[];
}

const formatCurrency = (value: number, currency: string = "ETB"): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);

export default function BankAccountsListPage({
  initialData = [],
}: BankAccountsListPageProps) {
  const router = useRouter();
  const [data] = useState<BankAccount[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Bank Accounts" },
  ];

  const bankOptions = useMemo(
    () =>
      Array.from(
        new Set(data.map((account) => account.bankName).filter(Boolean)),
      ).map((value) => ({ label: String(value), value: String(value) })),
    [data],
  );

  const filterFields: FilterField[] = [
    { type: "text", key: "search", label: "Search", placeholder: "Search by account name or number..." },
    { type: "select", key: "bankName", label: "Bank", placeholder: "All Banks", options: bankOptions },
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

  const columns: Column<BankAccount>[] = [
    { key: "accountCode", label: "Code", sortable: true },
    { key: "accountName", label: "Account Name", sortable: true },
    { key: "bankName", label: "Bank", render: (value) => value ?? "—" },
    { key: "accountNumber", label: "Account #" },
    { key: "currency", label: "Currency", sortable: true },
    {
      key: "currentBalance",
      label: "Balance",
      render: (value, record) => formatCurrency(value as number, (record as BankAccount).currency),
      sortable: true,
    },
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
            `/api/records/master-data/bank-accounts/${record.id}`,
            "bank account",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(
            error instanceof Error
              ? error.message
              : "Failed to delete bank account",
          );
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<CreditCard size={36} />}
      title="No Bank Accounts Found"
      message="There are no bank accounts to display. Create your first bank account to get started."
      action={{ label: "Create Bank Account", onClick: handleCreate }}
    />
  );

  const pageActions: Action[] = [
    { label: "Create Bank Account", variant: "primary", onClick: handleCreate },
  ];

  const totalAccounts = data.length;
  const activeAccounts = data.filter((a) => a.isActive).length;
  const inactiveAccounts = data.filter((a) => !a.isActive).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Bank Accounts"
        subtitle="Manage all your organizational bank accounts in one place."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <MetricCard label="Total Accounts" value={totalAccounts} icon={<CreditCard size={18} />} borderColor={colors.primary[500]} />
        <MetricCard label="Active" value={activeAccounts} icon={<CheckCircle size={18} />} borderColor={colors.success[500]} color={colors.success[700]} />
        <MetricCard label="Inactive" value={inactiveAccounts} icon={<XCircle size={18} />} borderColor={colors.danger[500]} color={colors.danger[700]} />
      </div>

      <FilterCard title="Filter Bank Accounts" fields={filterFields} onFilter={(values) => console.log("Filter values", values)} onReset={() => undefined} />

      <DataTable columns={columns} data={data} actions={tableActions} emptyState={emptyState} recordCount={data.length} />
    </div>
  );
}
