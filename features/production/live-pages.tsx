"use client";

import { DataTable, EmptyState, MetricCard, PageHeader, SearchInput } from "@/components/shared";
import type { Breadcrumb, Column } from "@/components/shared";
import { spacing } from "@/components/ui/spacing";
import { useMemo, useState } from "react";

function gridStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: `${spacing.card.gap}px`,
  };
}

function formatMoney(value: number) {
  return Number(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function BomListPage({ rows }: { rows: Array<{ id: string; bomNo: string; bomName: string; finishedGoodCode: string; finishedGoodName: string; outputQty: number; uomName: string | null; version: string; status: string; isDefault: boolean; componentCount: number; }> }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.bomNo, row.bomName, row.finishedGoodCode, row.finishedGoodName, row.version, row.status].some((value) => String(value).toLowerCase().includes(query)));
  }, [rows, search]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "bomNo", label: "BOM No" },
    { key: "bomName", label: "BOM Name" },
    { key: "finishedGoodCode", label: "FG Code" },
    { key: "finishedGoodName", label: "Finished Good" },
    { key: "outputQty", label: "Output Qty" },
    { key: "uomName", label: "UOM" },
    { key: "componentCount", label: "Components" },
    { key: "version", label: "Version" },
    { key: "status", label: "Status" },
  ];
  const breadcrumbs: Breadcrumb[] = [{ label: "Production", href: "/production" }, { label: "Bill of Materials" }];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Bill of Materials" subtitle="Live BOM recipes for finished goods, component planning, and standard cost baselines." breadcrumbs={breadcrumbs} />
      <div style={gridStyle()}>
        <MetricCard label="Total BOMs" value={filtered.length} />
        <MetricCard label="Active BOMs" value={filtered.filter((row) => row.status === "ACTIVE").length} />
        <MetricCard label="Default BOMs" value={filtered.filter((row) => row.isDefault).length} />
        <MetricCard label="FG Covered" value={new Set(filtered.map((row) => row.finishedGoodCode)).size} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search BOM name, number, or finished good..." />
      <DataTable columns={columns} data={filtered} pageSize={15} emptyState={<EmptyState title="No BOMs" message="No bill of materials records have been created yet." />} />
    </div>
  );
}

export function CostSettingsListPage({ rows }: { rows: Array<{ id: string; categoryName: string; allocationMethod: string; rate: number; effectiveFrom: string; status: string; description: string | null; }> }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => [row.categoryName, row.allocationMethod, row.status, row.description ?? ""].some((value) => String(value).toLowerCase().includes(query)));
  }, [rows, search]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "categoryName", label: "Category" },
    { key: "allocationMethod", label: "Allocation Method" },
    { key: "rate", label: "Rate", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "effectiveFrom", label: "Effective From", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "status", label: "Status" },
    { key: "description", label: "Description" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Cost Settings" subtitle="Configured production overhead rates used for batch and daily costing." breadcrumbs={[{ label: "Production", href: "/production" }, { label: "Cost Settings" }]} />
      <div style={gridStyle()}>
        <MetricCard label="Total Rates" value={filtered.length} />
        <MetricCard label="Active Rates" value={filtered.filter((row) => row.status === "ACTIVE").length} />
        <MetricCard label="Fixed/Shift" value={filtered.filter((row) => row.allocationMethod === "FIXED_PER_SHIFT").length} />
        <MetricCard label="Per Unit" value={filtered.filter((row) => row.allocationMethod === "COST_PER_UNIT").length} />
      </div>
      <SearchInput value={search} onChange={setSearch} placeholder="Search cost settings..." />
      <DataTable columns={columns} data={filtered} pageSize={15} emptyState={<EmptyState title="No Cost Settings" message="No overhead cost settings are configured yet." />} />
    </div>
  );
}

export function BatchCostReportPage({ rows }: { rows: Array<{ batchNo: string; productionDate: string; shiftCode: string; productCode: string; productName: string; producedQty: number; acceptedQty: number; materialCost: number; wastageCost: number; overheadCost: number; laborCost: number; totalCost: number; costPerUnit: number; status: string; }> }) {
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "batchNo", label: "Batch No" },
    { key: "productionDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "shiftCode", label: "Shift" },
    { key: "productCode", label: "Product Code" },
    { key: "productName", label: "Product" },
    { key: "producedQty", label: "Produced" },
    { key: "acceptedQty", label: "Accepted" },
    { key: "materialCost", label: "Material Cost", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "wastageCost", label: "Wastage Cost", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "overheadCost", label: "Overhead", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "totalCost", label: "Total Cost", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "costPerUnit", label: "Cost / Unit", render: (value) => formatMoney(Number(value ?? 0)) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Batch Cost Report" subtitle="Actual production cost per batch from posted issues, finished goods output, and active overhead settings." breadcrumbs={[{ label: "Production", href: "/production" }, { label: "Batch Cost Report" }]} />
      <DataTable columns={columns} data={rows} pageSize={15} emptyState={<EmptyState title="No Batch Costs" message="No posted production batches are available yet." />} />
    </div>
  );
}

export function DailyCostSummaryPage({ rows }: { rows: Array<{ productionDate: string; shiftCode: string; productCode: string; productName: string; totalProduced: number; totalAccepted: number; totalRejected: number; totalCost: number; averageCostPerUnit: number; }> }) {
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "productionDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "shiftCode", label: "Shift" },
    { key: "productCode", label: "Product Code" },
    { key: "productName", label: "Product" },
    { key: "totalProduced", label: "Produced" },
    { key: "totalAccepted", label: "Accepted" },
    { key: "totalRejected", label: "Rejected" },
    { key: "totalCost", label: "Total Cost", render: (value) => formatMoney(Number(value ?? 0)) },
    { key: "averageCostPerUnit", label: "Average Cost / Unit", render: (value) => formatMoney(Number(value ?? 0)) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Daily Cost Summary" subtitle="Daily production cost rollup by shift and finished good from real batch postings." breadcrumbs={[{ label: "Production", href: "/production" }, { label: "Daily Cost Summary" }]} />
      <DataTable columns={columns} data={rows} pageSize={15} emptyState={<EmptyState title="No Daily Cost Summary" message="No daily production costing rows are available yet." />} />
    </div>
  );
}
