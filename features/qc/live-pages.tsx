"use client";

import { DataTable, EmptyState, MetricCard, PageHeader } from "@/components/shared";
import type { Column } from "@/components/shared";
import { spacing } from "@/components/ui/spacing";

function gridStyle(): React.CSSProperties {
  return { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: `${spacing.card.gap}px` };
}

export function QcTestsLivePage({ title, rows }: { title: string; rows: Array<{ testNo: string; testType: string; sampleDate: string; itemCode: string | null; itemName: string | null; batchNo: string | null; locationName: string | null; result: string; status: string; testedByName: string | null; }> }) {
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "testNo", label: "Test No" },
    { key: "sampleDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "itemCode", label: "Item Code" },
    { key: "itemName", label: "Item" },
    { key: "batchNo", label: "Batch" },
    { key: "locationName", label: "Location" },
    { key: "result", label: "Result" },
    { key: "status", label: "Status" },
    { key: "testedByName", label: "Tested By" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle="Live QC test history from the shared quality test ledger." breadcrumbs={[{ label: "QC", href: "/qc" }, { label: title }]} />
      <div style={gridStyle()}>
        <MetricCard label="Total Tests" value={rows.length} />
        <MetricCard label="Passed" value={rows.filter((row) => row.result === "PASSED").length} />
        <MetricCard label="Failed" value={rows.filter((row) => row.result === "FAILED").length} />
        <MetricCard label="Pending" value={rows.filter((row) => row.result === "PENDING").length} />
      </div>
      <DataTable columns={columns} data={rows} pageSize={15} emptyState={<EmptyState title={`No ${title}`} message={`No ${title.toLowerCase()} records are available yet.`} />} />
    </div>
  );
}

export function HoldReleaseLivePage({ rows }: { rows: Array<{ holdNo: string; batchNo: string | null; itemCode: string; itemName: string; locationName: string; quantity: number; holdReason: string; status: string; releasedAt: string | null; }> }) {
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "holdNo", label: "Hold No" },
    { key: "batchNo", label: "Batch" },
    { key: "itemCode", label: "Item Code" },
    { key: "itemName", label: "Item" },
    { key: "locationName", label: "Location" },
    { key: "quantity", label: "Quantity" },
    { key: "holdReason", label: "Hold Reason" },
    { key: "status", label: "Status" },
    { key: "releasedAt", label: "Released At", render: (value) => value ? new Date(String(value)).toLocaleString("en-KE") : "-" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Hold / Release" subtitle="QC disposition register for held, released, rejected, and scrapped stock or batches." breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Hold / Release" }]} />
      <DataTable columns={columns} data={rows} pageSize={15} emptyState={<EmptyState title="No Hold / Release" message="No QC hold or release documents exist yet." />} />
    </div>
  );
}

export function NonconformityLivePage({ rows }: { rows: Array<{ ncNo: string; batchNo: string | null; itemCode: string | null; itemName: string | null; locationName: string | null; issueDescription: string; severity: string; reinspectionResult: string | null; status: string; }> }) {
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "ncNo", label: "NC No" },
    { key: "batchNo", label: "Batch" },
    { key: "itemCode", label: "Item Code" },
    { key: "itemName", label: "Item" },
    { key: "locationName", label: "Location" },
    { key: "severity", label: "Severity" },
    { key: "reinspectionResult", label: "Reinspection" },
    { key: "status", label: "Status" },
    { key: "issueDescription", label: "Issue" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Nonconformity" subtitle="Corrective-action tracker for quality exceptions tied to production batches, items, and locations." breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Nonconformity" }]} />
      <DataTable columns={columns} data={rows} pageSize={15} emptyState={<EmptyState title="No Nonconformities" message="No QC nonconformities are recorded yet." />} />
    </div>
  );
}
