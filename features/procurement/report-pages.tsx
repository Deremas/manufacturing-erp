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
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import type {
  CommitmentRegisterRow,
  SupplierPerformanceRow,
} from "@/services/procurement/procurement-report.service";

function formatMoney(value: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function kpiGridStyle() {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: `${spacing.card.gap}px`,
  } satisfies React.CSSProperties;
}

export function SupplierPerformanceReportPage({ rows }: { rows: SupplierPerformanceRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.supplierCode, row.supplierName]
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<SupplierPerformanceRow>[] = [
    { key: "supplierCode", label: "Supplier Code" },
    { key: "supplierName", label: "Supplier" },
    { key: "totalPurchaseOrders", label: "POs" },
    { key: "totalOrderedValue", label: "Ordered Value", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "totalReceivedValue", label: "Received Value", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "totalReturnedValue", label: "Returned Value", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "outstandingPayable", label: "Outstanding Payable", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "averageLeadTimeDays", label: "Avg Lead Days", render: (value) => Number(value ?? 0).toFixed(1) },
    { key: "onTimeReceiptRate", label: "On-Time Rate", render: (value) => formatPercent(Number(value ?? 0)) },
    { key: "acceptanceRate", label: "Acceptance Rate", render: (value) => formatPercent(Number(value ?? 0)) },
  ];

  const totals = filtered.reduce((sum, row) => ({
    ordered: sum.ordered + row.totalOrderedValue,
    received: sum.received + row.totalReceivedValue,
    payable: sum.payable + row.outstandingPayable,
  }), { ordered: 0, received: 0, payable: 0 });

  const breadcrumbs: Breadcrumb[] = [
    { label: "Procurement", href: "/procurement" },
    { label: "Supplier Performance" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Supplier Performance"
        subtitle="Live supplier scorecard from purchase orders, GRN receipts, returns, and supplier invoices."
        breadcrumbs={breadcrumbs}
      />
      <div style={kpiGridStyle()}>
        <MetricCard label="Suppliers" value={String(filtered.length)} />
        <MetricCard label="Ordered Value" value={formatMoney(totals.ordered)} />
        <MetricCard label="Received Value" value={formatMoney(totals.received)} />
        <MetricCard label="Outstanding Payable" value={formatMoney(totals.payable)} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search supplier performance..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={<EmptyState title="No Supplier Performance" message="No supplier performance rows are available yet." />}
      />
    </div>
  );
}

export function CommitmentRegisterReportPage({ rows }: { rows: CommitmentRegisterRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.poNo, row.supplierName, row.deliveryLocationName, row.status]
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<CommitmentRegisterRow>[] = [
    { key: "poNo", label: "PO No" },
    { key: "poDate", label: "PO Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "supplierName", label: "Supplier" },
    { key: "deliveryLocationName", label: "Delivery Location" },
    { key: "expectedDeliveryDate", label: "Expected Delivery", render: (value) => value ? new Date(String(value)).toLocaleDateString("en-KE") : "-" },
    { key: "status", label: "Status", render: (value) => <span style={{ color: colors.text.primary }}>{String(value)}</span> },
    { key: "totalAmount", label: "PO Value", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "receivedValue", label: "Received Value", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "invoicedAmount", label: "Invoiced", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "paidAmount", label: "Paid", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "outstandingCommitment", label: "Open Commitment", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "outstandingPayable", label: "Open Payable", render: (value) => formatMoney(Number(value ?? 0)) },
  ];

  const totals = filtered.reduce((sum, row) => ({
    total: sum.total + row.totalAmount,
    openCommitment: sum.openCommitment + row.outstandingCommitment,
    openPayable: sum.openPayable + row.outstandingPayable,
  }), { total: 0, openCommitment: 0, openPayable: 0 });

  const breadcrumbs: Breadcrumb[] = [
    { label: "Procurement", href: "/procurement" },
    { label: "Commitment Register" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Commitment Register"
        subtitle="Track open procurement commitments and related payables from live purchase order, receipt, invoice, and payment data."
        breadcrumbs={breadcrumbs}
      />
      <div style={kpiGridStyle()}>
        <MetricCard label="Open Orders" value={String(filtered.filter((row) => row.outstandingCommitment > 0).length)} />
        <MetricCard label="Total Ordered" value={formatMoney(totals.total)} />
        <MetricCard label="Open Commitment" value={formatMoney(totals.openCommitment)} />
        <MetricCard label="Open Payable" value={formatMoney(totals.openPayable)} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search commitment register..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={<EmptyState title="No Commitments" message="No purchase order commitments are available yet." />}
      />
    </div>
  );
}
