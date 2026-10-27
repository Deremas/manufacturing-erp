import Link from "next/link";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";

type Report = {
  rows: Array<{ bankAccountId: string; accountCode: string; accountName: string; sourceType: string; sourceId: string; postingType: string; amount: number; postedAt: string | null; memo: string | null }>;
  accounts: Array<{ bankAccountId: string; accountCode: string; accountName: string; currency: string; openingBalance: number; currentBalance: number; movementTotal: number; expectedBalance: number; variance: number }>;
};

function money(value: number) { return value.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

export default function BankMovementPage({ report }: { report: Report }) {
  return <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
    <PageHeader title="Bank Movements" subtitle="Posted procurement, sales, receipt, return, and operational bank activity" breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Bank Movements" }]} actions={<Link href="/master-data/bank-accounts" style={{ padding: "10px 14px", border: "1px solid #d0d5dd", borderRadius: 10, textDecoration: "none", color: "#101828" }}>Bank Accounts</Link>} />
    <FormCard title="Reconciliation Summary" variant="teal-header">
      {report.accounts.length === 0 ? <EmptyState title="No posted bank activity" message="Approved and posted bank-linked finance transactions will appear here." /> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}><thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Account", "Opening", "Posted Movement", "Expected", "Current", "Variance", "Status"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead><tbody>{report.accounts.map((account) => <tr key={account.bankAccountId} style={{ borderTop: "1px solid #eaecf0" }}><td style={{ padding: 12 }}>{account.accountCode} - {account.accountName}</td><td style={{ padding: 12 }}>{money(account.openingBalance)}</td><td style={{ padding: 12 }}>{money(account.movementTotal)}</td><td style={{ padding: 12 }}>{money(account.expectedBalance)}</td><td style={{ padding: 12 }}>{money(account.currentBalance)}</td><td style={{ padding: 12 }}>{money(account.variance)}</td><td style={{ padding: 12 }}><StatusBadge status={Math.abs(account.variance) < 0.01 ? "posted" : "rejected"} /></td></tr>)}</tbody></table></div>}
    </FormCard>
    <FormCard title="Posted Bank Movements" variant="teal-header">
      {report.rows.length === 0 ? <EmptyState title="No bank movements" message="No posted bank-linked finance postings are available." /> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}><thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Date", "Account", "Source", "Posting Type", "Amount", "Memo"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead><tbody>{report.rows.map((row, index) => <tr key={`${row.sourceType}-${row.sourceId}-${index}`} style={{ borderTop: "1px solid #eaecf0" }}><td style={{ padding: 12 }}>{row.postedAt ? new Date(row.postedAt).toLocaleString("en-ET") : "-"}</td><td style={{ padding: 12 }}>{row.accountCode} - {row.accountName}</td><td style={{ padding: 12 }}>{row.sourceType}</td><td style={{ padding: 12 }}>{row.postingType}</td><td style={{ padding: 12, color: row.amount < 0 ? "#b42318" : "#027a48" }}>{money(row.amount)}</td><td style={{ padding: 12 }}>{row.memo ?? "-"}</td></tr>)}</tbody></table></div>}
    </FormCard>
  </div>;
}
