"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import ReportExportActions from "@/components/reporting/ReportExportActions";
import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { FinanceExceptionRow } from "@/services/finance/finance-exception.service";

export default function FinanceExceptionsPage({ rows }: { rows: FinanceExceptionRow[] }) {
  const high = rows.filter((row) => row.severity === "HIGH").length;
  const exportRows = rows.map((row) => ({
    Date: row.recordDate,
    Severity: row.severity,
    Exception: row.exceptionType,
    Source: row.sourceType,
    Document: row.documentNo,
    Amount: row.amount,
    Description: row.description,
  }));

  return <div className="print-content" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
    <PageHeader
      title="Finance Exceptions"
      subtitle="Posted finance records requiring reconciliation or accounting attention."
      breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Exceptions" }]}
      actions={<ReportExportActions fileName="finance-exceptions" reportTitle="Finance Exception Register" generatedAt={new Date().toISOString()} rows={exportRows} />}
    />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
      <FormCard title="Open Exceptions"><strong style={{ fontSize: 28 }}>{rows.length}</strong></FormCard>
      <FormCard title="High Priority"><strong style={{ fontSize: 28, color: "#b42318" }}>{high}</strong></FormCard>
      <FormCard title="Unallocated Receipts"><strong style={{ fontSize: 28 }}>{rows.filter((row) => row.exceptionType === "UNALLOCATED_RECEIPT").length}</strong></FormCard>
    </div>
    <FormCard title="Exception Register" variant="teal-header">
      {rows.length === 0 ? <EmptyState title="No finance exceptions" message="Posted finance records and journals currently reconcile." /> : <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
          <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Date", "Severity", "Exception", "Source", "Document", "Amount (ETB)", "Description", "Action"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} style={{ borderTop: "1px solid #eaecf0" }}>
            <td style={{ padding: 12 }}>{new Date(row.recordDate).toLocaleDateString("en-ET")}</td>
            <td style={{ padding: 12 }}><StatusBadge status={row.severity === "HIGH" ? "rejected" : "pending"} /></td>
            <td style={{ padding: 12 }}>{row.exceptionType.replaceAll("_", " ")}</td>
            <td style={{ padding: 12 }}>{row.sourceType}</td>
            <td style={{ padding: 12 }}>{row.documentNo}</td>
            <td style={{ padding: 12 }}>{row.amount.toLocaleString("en-ET", { minimumFractionDigits: 2 })}</td>
            <td style={{ padding: 12 }}>{row.description}</td>
            <td style={{ padding: 12 }}>{row.sourceHref ? <Link href={row.sourceHref} title="Open source document" aria-label="Open source document"><ExternalLink size={18} /></Link> : "-"}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </FormCard>
  </div>;
}
