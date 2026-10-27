"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eye } from "lucide-react";

import {
  DataTable,
  EmptyState,
  MetricCard,
  PageHeader,
  SearchInput,
} from "@/components/shared";
import type { Breadcrumb, Column } from "@/components/shared";
import { spacing } from "@/components/ui/spacing";
import { formatMoney } from "@/lib/utils/format-number";
import { publicViewUrl } from "@/lib/routing";

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: `${spacing.card.gap}px`,
};

export interface AccountRow {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  parentAccountName: string | null;
  isControlAccount: boolean;
  isActive: boolean;
}

export interface JournalEntryRow {
  id: string;
  journalNo: string;
  entryDate: string;
  sourceType: string;
  description: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  lineCount: number;
}

export interface GeneralLedgerRow {
  journalNo: string;
  entryDate: string;
  sourceType: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  accountType: string;
  debit: number;
  credit: number;
  balance: number;
}

export function ChartOfAccountsLivePage({ rows }: { rows: AccountRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.accountCode,
        row.accountName,
        row.accountType,
        row.parentAccountName ?? "",
        row.isControlAccount ? "control" : "",
        row.isActive ? "active" : "inactive",
      ].some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<AccountRow>[] = [
    { key: "accountCode", label: "Account Code" },
    { key: "accountName", label: "Account Name" },
    { key: "accountType", label: "Type" },
    { key: "parentAccountName", label: "Parent" },
    { key: "isControlAccount", label: "Control", render: (value) => String(Boolean(value) ? "Yes" : "No") },
    { key: "isActive", label: "Status", render: (value) => String(Boolean(value) ? "Active" : "Inactive") },
  ];

  const breadcrumbs: Breadcrumb[] = [
    { label: "Accounting", href: "/accounting" },
    { label: "Chart of Accounts" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Chart of Accounts"
        subtitle="Live account structure used by procurement journal postings and downstream finance reporting."
        breadcrumbs={breadcrumbs}
      />
      <div style={gridStyle}>
        <MetricCard label="Accounts" value={filtered.length} />
        <MetricCard label="Control Accounts" value={filtered.filter((row) => row.isControlAccount).length} />
        <MetricCard label="Active Accounts" value={filtered.filter((row) => row.isActive).length} />
        <MetricCard label="Account Types" value={new Set(filtered.map((row) => row.accountType)).size} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search chart of accounts..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={<EmptyState title="No Accounts" message="No live accounts are available yet." />}
      />
    </div>
  );
}

export function JournalEntriesLivePage({ rows }: { rows: JournalEntryRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.journalNo, row.sourceType, row.description, row.status]
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<JournalEntryRow>[] = [
    { key: "journalNo", label: "Journal No" },
    { key: "entryDate", label: "Entry Date", render: (value) => new Date(String(value)).toLocaleString("en-KE") },
    { key: "sourceType", label: "Source" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status" },
    { key: "lineCount", label: "Lines" },
    { key: "totalDebit", label: "Debit", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "totalCredit", label: "Credit", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "actions", label: "Actions", render: (_value, record) => <Link href={publicViewUrl("accounting.journal", Number((record as { publicId: number }).publicId))} title="View journal detail" aria-label="View journal detail"><Eye size={16} /></Link> },
  ];

  const totalDebit = filtered.reduce((sum, row) => sum + Number(row.totalDebit ?? 0), 0);
  const totalCredit = filtered.reduce((sum, row) => sum + Number(row.totalCredit ?? 0), 0);
  const breadcrumbs: Breadcrumb[] = [
    { label: "Accounting", href: "/accounting" },
    { label: "Journal Entries" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Journal Entries"
        subtitle="Balanced live journal entries created from approved procurement invoice and payment flows."
        breadcrumbs={breadcrumbs}
      />
      <div style={gridStyle}>
        <MetricCard label="Entries" value={filtered.length} />
        <MetricCard label="Posted" value={filtered.filter((row) => row.status === "POSTED").length} />
        <MetricCard label="Total Debit" value={formatMoney(totalDebit)} />
        <MetricCard label="Total Credit" value={formatMoney(totalCredit)} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search journal entries..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={<EmptyState title="No Journal Entries" message="No live journal entries have been posted yet." />}
      />
    </div>
  );
}

export function GeneralLedgerLivePage({ rows, initialSearch = "" }: { rows: GeneralLedgerRow[]; initialSearch?: string }) {
  const [search, setSearch] = useState(initialSearch);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.journalNo, row.sourceType, row.accountCode, row.accountName, row.description ?? ""]
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<GeneralLedgerRow>[] = [
    { key: "entryDate", label: "Entry Date", render: (value) => new Date(String(value)).toLocaleString("en-KE") },
    { key: "journalNo", label: "Journal No" },
    { key: "sourceType", label: "Source" },
    { key: "accountCode", label: "Account Code" },
    { key: "accountName", label: "Account" },
    { key: "description", label: "Description" },
    { key: "debit", label: "Debit", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "credit", label: "Credit", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "runningBalance", label: "Running Balance", render: (value) => formatMoney(Number(value ?? 0)) },
  ];

  const breadcrumbs: Breadcrumb[] = [
    { label: "Accounting", href: "/accounting" },
    { label: "General Ledger" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="General Ledger"
        subtitle="Live account movement ledger built from posted journal lines."
        breadcrumbs={breadcrumbs}
      />
      <div style={gridStyle}>
        <MetricCard label="Ledger Rows" value={filtered.length} />
        <MetricCard label="Accounts Touched" value={new Set(filtered.map((row) => row.accountCode)).size} />
        <MetricCard label="Total Debit" value={formatMoney(filtered.reduce((sum, row) => sum + Number(row.debit ?? 0), 0))} />
        <MetricCard label="Total Credit" value={formatMoney(filtered.reduce((sum, row) => sum + Number(row.credit ?? 0), 0))} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search general ledger..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={20}
        emptyState={<EmptyState title="No Ledger Entries" message="No posted journal lines are available yet." />}
      />
    </div>
  );
}

export function TrialBalanceLivePage({ rows }: { rows: TrialBalanceRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.accountCode, row.accountName, row.accountType]
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<TrialBalanceRow>[] = [
    { key: "accountCode", label: "Account Code" },
    { key: "accountName", label: "Account" },
    { key: "accountType", label: "Type" },
    { key: "debit", label: "Debit", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "credit", label: "Credit", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "balance", label: "Balance", render: (value) => formatMoney(Number(value ?? 0)) },
  ];

  const totalDebit = filtered.reduce((sum, row) => sum + Number(row.debit ?? 0), 0);
  const totalCredit = filtered.reduce((sum, row) => sum + Number(row.credit ?? 0), 0);
  const breadcrumbs: Breadcrumb[] = [
    { label: "Accounting", href: "/accounting" },
    { label: "Trial Balance" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Trial Balance"
        subtitle="Live trial balance view from posted journals across the current chart of accounts."
        breadcrumbs={breadcrumbs}
      />
      <div style={gridStyle}>
        <MetricCard label="Accounts" value={filtered.length} />
        <MetricCard label="Debit Total" value={formatMoney(totalDebit)} />
        <MetricCard label="Credit Total" value={formatMoney(totalCredit)} />
        <MetricCard label="Variance" value={formatMoney(totalDebit - totalCredit)} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search trial balance..." />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={<EmptyState title="No Trial Balance" message="No trial balance rows are available yet." />}
      />
    </div>
  );
}
