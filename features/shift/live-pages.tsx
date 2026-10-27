"use client";

import { useRouter } from "next/navigation";
import { DataTable, EmptyState, MetricCard, PageHeader } from "@/components/shared";
import { ActionButtons } from "@/components/shared";
import type { Column } from "@/components/shared";
import { spacing } from "@/components/ui/spacing";
import { publicViewUrl } from "@/lib/routing";

function gridStyle(): React.CSSProperties {
  return { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: `${spacing.card.gap}px` };
}

export function ShiftSessionsLivePage({ rows }: { rows: Array<{ id: string; publicId: number; sessionNo: string; productionDate: string; shiftCode: string; locationName: string; status: string; startedByName: string | null; startedAt: string | null; employeeCount: number; }> }) {
  const router = useRouter();
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "sessionNo", label: "Session No", render: (_value, record) => (
      <button type="button" onClick={() => router.push(publicViewUrl("shifts.session", record.publicId))} style={{ background: "none", border: 0, color: "#0f766e", fontWeight: 600, cursor: "pointer", padding: 0 }}>
        {record.sessionNo}
      </button>
    ) },
    { key: "productionDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "shiftCode", label: "Shift" },
    { key: "locationName", label: "Location" },
    { key: "employeeCount", label: "Employees" },
    { key: "startedByName", label: "Started By" },
    { key: "startedAt", label: "Started At", render: (value) => value ? new Date(String(value)).toLocaleString("en-KE") : "-" },
    { key: "status", label: "Status" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Shift Sessions"
        subtitle="Live production shift control across attendance, materials, output, downtime, and QC."
        breadcrumbs={[{ label: "Shifts", href: "/shifts" }, { label: "Shift Sessions" }]}
        actions={<ActionButtons actions={[{ label: "Start Shift", variant: "primary", onClick: () => router.push("/shifts/sessions/start") }]} />}
      />
      <div style={gridStyle()}>
        <MetricCard label="Total Sessions" value={rows.length} />
        <MetricCard label="Active Sessions" value={rows.filter((row) => row.status === "ACTIVE").length} />
        <MetricCard label="Completed Sessions" value={rows.filter((row) => row.status === "COMPLETED").length} />
        <MetricCard label="Posted Sessions" value={rows.filter((row) => row.status === "POSTED").length} />
      </div>
      <DataTable columns={columns} data={rows} pageSize={15} emptyState={<EmptyState title="No Shift Sessions" message="No shift sessions have been started yet." />} />
    </div>
  );
}

export function ShiftReportPage({ title, subtitle, rows, columns }: { title: string; subtitle: string; rows: Array<Record<string, string | number | null>>; columns: Array<{ key: string; label: string; render?: (value: unknown) => React.ReactNode; }>; }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={[{ label: "Shifts", href: "/shifts" }, { label: title }]} />
      <DataTable columns={columns as Column<Record<string, string | number | null>>[]} data={rows} pageSize={15} emptyState={<EmptyState title={`No ${title}`} message={`No ${title.toLowerCase()} rows are available yet.`} />} />
    </div>
  );
}
