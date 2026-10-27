import Link from "next/link";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";

type JournalDetail = {
  id: string;
  journalNo: string;
  entryDate: string;
  sourceType: string;
  sourceId: string;
  description: string;
  status: string;
  totalDebit: number;
  totalCredit: number;
  postedAt: string | null;
  postedByName: string | null;
  lines: Array<{
    accountCode: string;
    accountName: string;
    description: string | null;
    debit: number;
    credit: number;
  }>;
};

function money(value: number) {
  return value.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function JournalDetailPage({ journal }: { journal: JournalDetail | null }) {
  if (!journal) {
    return (
      <div style={{ padding: 24, background: "#f8fafc" }}>
        <PageHeader title="Journal Entry" subtitle="Posted accounting journal detail" breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Journal Entry" }]} />
        <FormCard title="Journal not found" variant="teal-header">
          <EmptyState title="Journal not found" message="This journal entry does not exist or is not visible to your account." />
        </FormCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        recordKind="accounting.journal"
        title={journal.journalNo}
        subtitle="Balanced accounting journal with source-document traceability"
        breadcrumbs={[{ label: "Accounting", href: "/accounting" }, { label: "Journal Entries", href: "/accounting/journals" }, { label: journal.journalNo }]}
        actions={<Link href="/accounting/journals" style={{ padding: "10px 14px", border: `1px solid ${colors.border}`, borderRadius: 10, textDecoration: "none", color: colors.text.primary }}>Back</Link>}
      />

      <FormCard title="Journal Summary" variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          <div><strong>Date</strong><div>{new Date(journal.entryDate).toLocaleDateString("en-ET")}</div></div>
          <div><strong>Source</strong><div>{journal.sourceType}</div></div>
          <div><strong>Source ID</strong><div style={{ wordBreak: "break-all" }}>{journal.sourceId}</div></div>
          <div><strong>Status</strong><div><StatusBadge status={journal.status.toLowerCase() === "posted" ? "posted" : "draft"} /></div></div>
          <div><strong>Posted By</strong><div>{journal.postedByName ?? "-"}</div></div>
          <div><strong>Posted At</strong><div>{journal.postedAt ? new Date(journal.postedAt).toLocaleString("en-ET") : "-"}</div></div>
          <div style={{ gridColumn: "1 / -1" }}><strong>Description</strong><div>{journal.description}</div></div>
        </div>
      </FormCard>

      <FormCard title="Journal Lines" variant="teal-header">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
            <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Account", "Description", "Debit", "Credit"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead>
            <tbody>
              {journal.lines.map((line, index) => (
                <tr key={`${line.accountCode}-${index}`} style={{ borderTop: `1px solid ${colors.border}` }}>
                  <td style={{ padding: 12 }}>{line.accountCode} - {line.accountName}</td>
                  <td style={{ padding: 12 }}>{line.description ?? "-"}</td>
                  <td style={{ padding: 12 }}>{money(line.debit)}</td>
                  <td style={{ padding: 12 }}>{money(line.credit)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr style={{ borderTop: `2px solid ${colors.border}`, fontWeight: 700 }}><td colSpan={2} style={{ padding: 12 }}>Totals</td><td style={{ padding: 12 }}>{money(journal.totalDebit)}</td><td style={{ padding: 12 }}>{money(journal.totalCredit)}</td></tr></tfoot>
          </table>
        </div>
      </FormCard>
    </div>
  );
}
