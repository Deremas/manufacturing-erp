"use client";

import { useMemo, useState } from "react";

import { DataTable, EmptyState, PageHeader, SearchInput } from "@/components/shared";
import type { Breadcrumb, Column } from "@/components/shared";
import { spacing } from "@/components/ui/spacing";
import type { InventoryReportRow } from "@/services/inventory/inventory-insights.service";

interface InventoryReportsPageProps {
  transfers: InventoryReportRow[];
  adjustments: InventoryReportRow[];
  issues: InventoryReportRow[];
  returns: InventoryReportRow[];
  requisitions: InventoryReportRow[];
}

function ReportSection({ title, rows }: { title: string; rows: InventoryReportRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.documentNo, row.locationName, row.counterpartyName, row.status, row.remarks]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<InventoryReportRow>[] = [
    { key: "documentNo", label: "Document No" },
    { key: "documentDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "status", label: "Status" },
    { key: "locationName", label: "Location" },
    { key: "counterpartyName", label: "Counterparty / Reason" },
    { key: "itemCount", label: "Items" },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}...`} />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={10}
        emptyState={<EmptyState title={`No ${title}`} message={`No ${title.toLowerCase()} found.`} />}
      />
    </div>
  );
}

export default function InventoryReportsPage({
  transfers,
  adjustments,
  issues,
  returns,
  requisitions,
}: InventoryReportsPageProps) {
  const breadcrumbs: Breadcrumb[] = [
    { label: "Reports", href: "/reports" },
    { label: "Inventory Reports" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px`, padding: `${spacing.page.padding}px` }}>
      <PageHeader
        title="Inventory Reports"
        subtitle="Live reporting for transfers, adjustments, issues, returns, and store requisitions."
        breadcrumbs={breadcrumbs}
      />
      <ReportSection title="Transfer Report" rows={transfers} />
      <ReportSection title="Adjustment Report" rows={adjustments} />
      <ReportSection title="Issue Report" rows={issues} />
      <ReportSection title="Return Report" rows={returns} />
      <ReportSection title="Store Requisition Report" rows={requisitions} />
    </div>
  );
}
