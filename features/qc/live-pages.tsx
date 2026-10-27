"use client";

import { ActionButtons } from "@/components/shared";
import { DataTable, EmptyState, MetricCard, PageHeader } from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { spacing } from "@/components/ui/spacing";
import { Check, ClipboardCheck, Eye, Plus, SearchCheck, ShieldAlert, ShieldCheck, ShieldX, Trash2 } from "lucide-react";

function gridStyle(): React.CSSProperties {
  return { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: `${spacing.card.gap}px` };
}

export function QcTasksLivePage({
  rows,
  title = "Production Output QC",
  subtitle = "Quality tasks generated when production output is submitted to a configured QC stage.",
}: {
  rows: Array<{ id: string; taskNo: string; testTypeName: string; testTypeCode: string; batchNo: string | null; itemCode: string | null; itemName: string | null; status: string; required: boolean; priority: string; dueDate: string | null; assignedToName: string | null; isOverdue: boolean }>;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "taskNo", label: "Task No" },
    { key: "testTypeName", label: "Test Type" },
    { key: "batchNo", label: "Batch" },
    { key: "itemName", label: "Item" },
    { key: "required", label: "Required", render: (value) => value ? "Yes" : "No" },
    { key: "priority", label: "Priority" },
    { key: "dueDate", label: "Due", render: (value, row) => value ? `${new Date(String(value)).toLocaleDateString("en-KE")}${row.isOverdue ? " (Overdue)" : ""}` : "-" },
    { key: "assignedToName", label: "Assigned To" },
    { key: "status", label: "Status" },
  ];
  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(`/qc/tasks/${(record as { id: string }).id}`) },
    { label: "Execute", icon: <ClipboardCheck size={16} />, onClick: (record) => router.push(`/qc/tasks/${(record as { id: string }).id}`) },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={[{ label: "QC", href: "/qc" }, { label: title }]}
        actions={<ActionButtons actions={[{ label: "QC Setup", variant: "secondary", onClick: () => router.push("/qc/setup") }]} />}
      />
      <div style={gridStyle()}>
        <MetricCard label="Open Tasks" value={rows.filter((row) => !["COMPLETED", "CANCELLED"].includes(row.status)).length} />
        <MetricCard label="Overdue" value={rows.filter((row) => row.isOverdue).length} />
        <MetricCard label="Awaiting Approval" value={rows.filter((row) => row.status === "AWAITING_APPROVAL").length} />
        <MetricCard label="Completed" value={rows.filter((row) => row.status === "COMPLETED").length} />
      </div>
      <DataTable columns={columns} data={rows} actions={actions} pageSize={15} emptyState={<EmptyState title="No QC Tasks" message="Tasks are generated when production output is submitted to a configured QC stage." />} />
    </div>
  );
}

export function QcTestsLivePage({ title, rows }: { title: string; rows: Array<{ id: string; testNo: string; testType: string; sampleDate: string; itemCode: string | null; itemName: string | null; batchNo: string | null; locationName: string | null; result: string; status: string; testedByName: string | null; }> }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "testNo", label: "Test No" },
    { key: "sampleDate", label: "Date", render: (value) => new Date(String(value)).toLocaleDateString("en-KE") },
    { key: "itemName", label: "Item" },
    { key: "batchNo", label: "Batch" },
    { key: "locationName", label: "Location" },
    { key: "result", label: "Result" },
    { key: "status", label: "Status" },
    { key: "testedByName", label: "Tested By" },
  ];

  const actions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => {
        if (title === "Water Test") {
          router.push(`/qc/water-test/${(record as { id: string }).id}`);
        }
      },
    },
    {
      label: "Check",
      icon: <SearchCheck size={16} />,
      onClick: (record) => {
        startTransition(async () => {
          setMessage("");
          const response = await fetch(`/api/qc/tests/${(record as { id: string }).id}/check`, { method: "POST" });
          const result = await response.json();
          if (!response.ok) return setMessage(result.error ?? "Unable to check QC test");
          router.refresh();
        });
      },
    },
    {
      label: "Approve",
      icon: <Check size={16} />,
      onClick: (record) => {
        startTransition(async () => {
          setMessage("");
          const response = await fetch(`/api/qc/tests/${(record as { id: string }).id}/approve`, { method: "POST" });
          const result = await response.json();
          if (!response.ok) {
            setMessage(result.error ?? "Unable to approve QC test");
            return;
          }
          router.refresh();
        });
      },
    },
    {
      label: "Reject",
      icon: <ShieldX size={16} />,
      color: "#b91c1c",
      onClick: (record) => {
        startTransition(async () => {
          setMessage("");
          const response = await fetch(`/api/qc/tests/${(record as { id: string }).id}/reject`, { method: "POST" });
          const result = await response.json();
          if (!response.ok) {
            setMessage(result.error ?? "Unable to reject QC test");
            return;
          }
          router.refresh();
        });
      },
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title={title}
        subtitle="Live QC test history from the shared quality test ledger."
        breadcrumbs={[{ label: "QC", href: "/qc" }, { label: title }]}
        actions={title === "Water Test" ? <ActionButtons actions={[{ label: "Create Test", variant: "primary", onClick: () => router.push("/qc/water-test/create") }]} /> : undefined}
      />
      {message ? <p style={{ margin: 0, color: "#b91c1c" }}>{message}</p> : null}
      <div style={gridStyle()}>
        <MetricCard label="Total Tests" value={rows.length} />
        <MetricCard label="Passed" value={rows.filter((row) => row.result === "PASSED").length} />
        <MetricCard label="Failed" value={rows.filter((row) => row.result === "FAILED").length} />
        <MetricCard label="Pending" value={rows.filter((row) => row.result === "PENDING").length} />
      </div>
      <DataTable columns={columns} data={rows} actions={title === "Water Test" ? actions : []} loading={isPending} pageSize={15} emptyState={<EmptyState title={`No ${title}`} message={`No ${title.toLowerCase()} records are available yet.`} />} />
    </div>
  );
}

export function HoldReleaseLivePage({ rows }: { rows: Array<{ id: string; holdNo: string; batchNo: string | null; itemCode: string; itemName: string; locationName: string; quantity: number; holdReason: string; status: string; releasedAt: string | null; }> }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "holdNo", label: "Hold No" },
    { key: "batchNo", label: "Batch" },
    { key: "itemName", label: "Item" },
    { key: "locationName", label: "Location" },
    { key: "quantity", label: "Quantity" },
    { key: "holdReason", label: "Hold Reason" },
    { key: "status", label: "Status" },
    { key: "releasedAt", label: "Released At", render: (value) => value ? new Date(String(value)).toLocaleString("en-KE") : "-" },
  ];

  const actions: TableAction[] = [
    {
      label: "Release",
      icon: <ShieldCheck size={16} />,
      onClick: (record) => {
        startTransition(async () => {
          setMessage("");
          const response = await fetch(`/api/qc/hold-release/${(record as { id: string }).id}/release`, { method: "POST" });
          const result = await response.json();
          if (!response.ok) {
            setMessage(result.error ?? "Unable to release QC hold");
            return;
          }
          router.refresh();
        });
      },
    },
    {
      label: "Reject",
      icon: <ShieldAlert size={16} />,
      color: "#b45309",
      onClick: (record) => {
        startTransition(async () => {
          setMessage("");
          const response = await fetch(`/api/qc/hold-release/${(record as { id: string }).id}/reject`, { method: "POST" });
          const result = await response.json();
          if (!response.ok) {
            setMessage(result.error ?? "Unable to reject QC hold");
            return;
          }
          router.refresh();
        });
      },
    },
    {
      label: "Scrap",
      icon: <Trash2 size={16} />,
      color: "#b91c1c",
      onClick: (record) => {
        startTransition(async () => {
          setMessage("");
          const response = await fetch(`/api/qc/hold-release/${(record as { id: string }).id}/scrap`, { method: "POST" });
          const result = await response.json();
          if (!response.ok) {
            setMessage(result.error ?? "Unable to scrap QC hold");
            return;
          }
          router.refresh();
        });
      },
    },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Inventory Holds" subtitle="QC disposition register for held, released, rejected, and scrapped stock or batches." breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Inventory Holds", href: "/qc/inventory-holds" }]} />
      {message ? <p style={{ margin: 0, color: "#b91c1c" }}>{message}</p> : null}
      <DataTable columns={columns} data={rows} actions={actions} loading={isPending} pageSize={15} emptyState={<EmptyState title="No Hold / Release" message="No QC hold or release documents exist yet." />} />
    </div>
  );
}

export function NonconformityLivePage({ rows }: { rows: Array<{ id: string; ncNo: string; batchNo: string | null; itemCode: string | null; itemName: string | null; locationName: string | null; issueDescription: string; severity: string; reinspectionResult: string | null; status: string; }> }) {
  const router = useRouter();
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "ncNo", label: "NC No" },
    { key: "batchNo", label: "Batch" },
    { key: "itemName", label: "Item" },
    { key: "locationName", label: "Location" },
    { key: "severity", label: "Severity" },
    { key: "reinspectionResult", label: "Reinspection" },
    { key: "status", label: "Status" },
    { key: "issueDescription", label: "Issue" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title="Nonconformity" subtitle="Corrective-action tracker for quality exceptions tied to production batches, items, and locations." breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Nonconformity" }]} actions={<button type="button" onClick={() => router.push("/qc/nonconformity/create")} style={{ border: 0, borderRadius: 10, padding: "11px 15px", background: "#00897b", color: "white", fontWeight: 700, cursor: "pointer" }}><Plus size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />Add Nonconformity</button>} />
      <DataTable columns={columns} data={rows} actions={[{ label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(`/qc/nonconformity/${(record as { id: string }).id}`) }]} pageSize={15} emptyState={<EmptyState title="No Nonconformities" message="No QC nonconformities are recorded yet." />} />
    </div>
  );
}
