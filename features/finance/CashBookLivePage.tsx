"use client";

import Link from "next/link";
import { DataTable, EmptyState, MetricCard, PageHeader, SearchInput } from "@/components/shared";
import type { Column } from "@/components/shared";
import { useMemo, useState } from "react";

export type CashBookRow = {
  journalId: string;
  journalNo: string;
  entryDate: string;
  sourceType: string;
  accountCode: string;
  accountName: string;
  description: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
};

function money(value: number) {
  return value.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CashBookLivePage({ rows }: { rows: CashBookRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.journalNo, row.sourceType, row.accountCode, row.accountName, row.description ?? ""].some((value) => value.toLowerCase().includes(query)));
  }, [rows, search]);
  const columns: Column<CashBookRow>[] = [
    { key: "entryDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-ET") },
    { key: "journalNo", label: "Journal", render: (value, record) => <Link href={`/accounting/journals/${record.journalId}`}>{String(value)}</Link> },
    { key: "accountCode", label: "Account", render: (_value, record) => `${record.accountCode} - ${record.accountName}` },
    { key: "sourceType", label: "Source" },
    { key: "description", label: "Description" },
    { key: "debit", label: "In", render: (value) => money(Number(value ?? 0)) },
    { key: "credit", label: "Out", render: (value) => money(Number(value ?? 0)) },
    { key: "runningBalance", label: "Balance", render: (value) => money(Number(value ?? 0)) },
  ];
  const totalIn = filtered.reduce((sum, row) => sum + row.debit, 0);
  const totalOut = filtered.reduce((sum, row) => sum + row.credit, 0);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader title="Cash Book" subtitle="Posted cash and bank movements from the accounting journal" breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Cash Book" }]} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard label="Entries" value={filtered.length} />
        <MetricCard label="Cash In" value={`ETB ${money(totalIn)}`} />
        <MetricCard label="Cash Out" value={`ETB ${money(totalOut)}`} />
        <MetricCard label="Net Movement" value={`ETB ${money(totalIn - totalOut)}`} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search journal, account, or source..." />
      <DataTable columns={columns} data={filtered} pageSize={20} emptyState={<EmptyState title="No posted cash movements" message="Cash and bank activity will appear after finance or operational journals are posted." />} />
    </div>
  );
}
