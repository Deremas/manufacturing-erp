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
import type { BankAccount } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockBankAccounts: BankAccount[] = [
  {
    id: "ba-1",
    accountCode: "BA-001",
    accountName: "Operating Account",
    accountType: "Current",
    bankId: "bank-1",
    bankName: "First National Bank",
    accountNumber: "****1234",
    branch: "Downtown Branch",
    swiftCode: "FNBKUS12",
    currency: "USD",
    openingBalance: 50000,
    currentBalance: 125000,
    isActive: true,
  },
  {
    id: "ba-2",
    accountCode: "BA-002",
    accountName: "Payroll Account",
    accountType: "Current",
    bankId: "bank-1",
    bankName: "First National Bank",
    accountNumber: "****5678",
    branch: "Downtown Branch",
    swiftCode: "FNBKUS12",
    currency: "USD",
    openingBalance: 20000,
    currentBalance: 45000,
    isActive: true,
  },
  {
    id: "ba-3",
    accountCode: "BA-003",
    accountName: "Savings Account",
    accountType: "Savings",
    bankId: "bank-2",
    bankName: "Standard Chartered",
    accountNumber: "****9012",
    branch: "City Centre",
    swiftCode: "SCBLUS33",
    currency: "USD",
    openingBalance: 100000,
    currentBalance: 250000,
    isActive: true,
  },
  {
    id: "ba-4",
    accountCode: "BA-004",
    accountName: "Foreign Currency Account",
    accountType: "Foreign Currency",
    bankId: "bank-2",
    bankName: "Standard Chartered",
    accountNumber: "****3456",
    branch: "City Centre",
    swiftCode: "SCBLUS33",
    currency: "EUR",
    openingBalance: 30000,
    currentBalance: 52000,
    isActive: false,
  },
];

const accountTypeOptions = [
  { label: "Current", value: "Current" },
  { label: "Savings", value: "Savings" },
  { label: "Foreign Currency", value: "Foreign Currency" },
];

const currencyOptions = [
  { label: "USD", value: "USD" },
  { label: "EUR", value: "EUR" },
  { label: "KES", value: "KES" },
];

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function BankAccountsPage() {
  const [data] = useState<BankAccount[]>(mockBankAccounts);
  const [search, setSearch] = useState("");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Bank Accounts" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by account name or number...",
    },
    {
      type: "select",
      key: "accountType",
      label: "Account Type",
      placeholder: "All Types",
      options: accountTypeOptions,
    },
    {
      type: "select",
      key: "currency",
      label: "Currency",
      placeholder: "All Currencies",
      options: currencyOptions,
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

  const columns: Column<BankAccount>[] = [
    { key: "accountCode", label: "Account Code", sortable: true },
    { key: "accountName", label: "Name", sortable: true },
    { key: "accountType", label: "Type", sortable: true },
    {
      key: "bankName",
      label: "Bank",
      render: (value) => value ?? "—",
    },
    { key: "accountNumber", label: "Account Number" },
    { key: "currency", label: "Currency", sortable: true },
    {
      key: "currentBalance",
      label: "Balance",
      render: (value) =>
        `$${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      sortable: true,
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
      title="No Bank Accounts Found"
      message="There are no bank accounts to display. Create your first bank account to get started."
      action={{
        label: "Create Bank Account",
        onClick: () => console.log("Create Bank Account"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Export",
      variant: "secondary",
      onClick: () => console.log("Export bank accounts"),
    },
    {
      label: "Create Bank Account",
      variant: "primary",
      onClick: () => console.log("Create Bank Account"),
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
        title="Bank Accounts"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <FilterCard
        title="Filter Bank Accounts"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <div style={{ maxWidth: "400px" }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by account name or number..."
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
