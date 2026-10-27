import Link from "next/link";

import { EmptyState, FormCard, PageHeader } from "@/components/shared";

type ExpenseRow = {
  journalId: string;
  journalNo: string;
  entryDate: string;
  sourceType: string;
  sourceId: string | null;
  accountCode: string;
  accountName: string;
  description: string | null;
  amount: number;
};

function money(value: number) {
  return value.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function ExpenseRegisterPage({ rows }: { rows: ExpenseRow[] }) {
  const total = rows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        title="Expense Register"
        subtitle="Posted expense movements sourced from the accounting journal"
        breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Expense Register" }]}
        actions={<Link href="/accounting/journals" style={{ padding: "10px 14px", border: "1px solid #d0d5dd", borderRadius: 10, textDecoration: "none", color: "#101828" }}>Journal Register</Link>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <FormCard title="Posted Entries"><strong style={{ fontSize: 26 }}>{rows.length}</strong></FormCard>
        <FormCard title="Posted Expense Total"><strong style={{ fontSize: 26 }}>ETB {money(total)}</strong></FormCard>
      </div>
      <FormCard title="Posted Expense Entries" variant="teal-header">
        {rows.length === 0 ? (
          <EmptyState title="No posted expenses" message="Posted expense journal lines will appear here after finance or operational posting." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
              <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Date", "Journal", "Expense Account", "Source", "Description", "Amount", "Action"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead>
              <tbody>{rows.map((row) => (
                <tr key={`${row.journalId}-${row.accountCode}`} style={{ borderTop: "1px solid #eaecf0" }}>
                  <td style={{ padding: 12 }}>{new Date(row.entryDate).toLocaleDateString("en-ET")}</td>
                  <td style={{ padding: 12 }}>{row.journalNo}</td>
                  <td style={{ padding: 12 }}>{row.accountCode} - {row.accountName}</td>
                  <td style={{ padding: 12 }}>{row.sourceType}{row.sourceId ? ` / ${row.sourceId}` : ""}</td>
                  <td style={{ padding: 12 }}>{row.description ?? "-"}</td>
                  <td style={{ padding: 12, color: "#b42318" }}>ETB {money(row.amount)}</td>
                  <td style={{ padding: 12 }}><Link aria-label={`View journal ${row.journalNo}`} title="View journal" href={`/accounting/journals/${row.journalId}`} style={{ color: "#00897b", textDecoration: "none" }}>View</Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}
