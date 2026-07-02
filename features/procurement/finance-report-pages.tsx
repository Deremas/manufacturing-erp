"use client";

import { useMemo, useState } from "react";

import {
  DataTable,
  EmptyState,
  MetricCard,
  PageHeader,
  SearchInput,
} from "@/components/shared";
import type { Breadcrumb, Column } from "@/components/shared";
import { spacing } from "@/components/ui/spacing";
import type {
  AccountsPayableAgingRow,
  ProcurementFinanceRegisterRow,
} from "@/services/procurement/accounts-payable-report.service";

function formatMoney(value: number) {
  return Number(value ?? 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: `${spacing.card.gap}px`,
};

export function AccountsPayableAgingPage({ rows }: { rows: AccountsPayableAgingRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.supplierCode, row.supplierName, row.invoiceNo, row.supplierInvoiceNo, row.status]
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<AccountsPayableAgingRow>[] = [
    { key: "supplierCode", label: "Supplier Code" },
    { key: "supplierName", label: "Supplier" },
    { key: "invoiceNo", label: "Invoice No" },
    { key: "supplierInvoiceNo", label: "Supplier Invoice No" },
    { key: "invoiceDate", label: "Invoice Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "dueDate", label: "Due Date", render: (value) => value ? new Date(String(value)).toLocaleDateString("en-KE") : "-" },
    { key: "ageDays", label: "Age Days" },
    { key: "balanceDue", label: "Balance Due", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "currentBucket", label: "Current", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "bucket1To30", label: "1-30", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "bucket31To60", label: "31-60", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "bucket61To90", label: "61-90", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "bucketOver90", label: ">90", render: (value) => formatMoney(Number(value ?? 0)) },
  ];

  const totals = filtered.reduce((sum, row) => ({
    balanceDue: sum.balanceDue + row.balanceDue,
    current: sum.current + row.currentBucket,
    overdue: sum.overdue + row.bucket1To30 + row.bucket31To60 + row.bucket61To90 + row.bucketOver90,
  }), { balanceDue: 0, current: 0, overdue: 0 });

  const breadcrumbs: Breadcrumb[] = [
    { label: "Finance", href: "/finance" },
    { label: "Aging Reports" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Accounts Payable Aging"
        subtitle="Live aging buckets from supplier invoices and current outstanding balances."
        breadcrumbs={breadcrumbs}
      />
      <div style={gridStyle}>
        <MetricCard label="Open Invoices" value={filtered.length} />
        <MetricCard label="Outstanding AP" value={formatMoney(totals.balanceDue)} />
        <MetricCard label="Current" value={formatMoney(totals.current)} />
        <MetricCard label="Overdue" value={formatMoney(totals.overdue)} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search AP aging..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={<EmptyState title="No AP Aging" message="No outstanding supplier invoices are available." />}
      />
    </div>
  );
}

export function ProcurementFinanceRegisterPage({ rows }: { rows: ProcurementFinanceRegisterRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.supplierName, row.invoiceNo, row.paymentNo, row.bankAccountName, row.postingType, row.memo]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<ProcurementFinanceRegisterRow>[] = [
    { key: "postedAt", label: "Posted At", render: (value) => value ? new Date(String(value)).toLocaleString("en-KE") : "-" },
    { key: "postingType", label: "Posting Type" },
    { key: "supplierName", label: "Supplier" },
    { key: "invoiceNo", label: "Invoice No" },
    { key: "paymentNo", label: "Payment No" },
    { key: "bankAccountName", label: "Bank Account" },
    { key: "amount", label: "Amount", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "currency", label: "Currency" },
    { key: "status", label: "Status" },
    { key: "memo", label: "Memo" },
  ];

  const totals = filtered.reduce((sum, row) => ({
    amount: sum.amount + row.amount,
    count: sum.count + 1,
  }), { amount: 0, count: 0 });

  const breadcrumbs: Breadcrumb[] = [
    { label: "Accounting", href: "/accounting" },
    { label: "Journal Entries" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Procurement Finance Register"
        subtitle="Transitional finance posting register sourced from supplier invoice and payment approvals."
        breadcrumbs={breadcrumbs}
      />
      <div style={gridStyle}>
        <MetricCard label="Postings" value={totals.count} />
        <MetricCard label="Total Value" value={formatMoney(totals.amount)} />
        <MetricCard label="Payable Posts" value={filtered.filter((row) => row.postingType === "SUPPLIER_PAYABLE").length} />
        <MetricCard label="Payment Posts" value={filtered.filter((row) => row.postingType === "SUPPLIER_PAYMENT").length} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search procurement finance register..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={<EmptyState title="No Finance Postings" message="No procurement finance postings have been created yet." />}
      />
    </div>
  );
}
