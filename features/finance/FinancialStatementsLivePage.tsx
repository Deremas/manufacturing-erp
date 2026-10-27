import Link from "next/link";

import ReportExportActions from "@/components/reporting/ReportExportActions";
import { EmptyState, FormCard, PageHeader } from "@/components/shared";

type StatementRow = { accountCode: string; accountName: string; accountType: string; debit: number; credit: number; balance: number };

function money(value: number) {
  return value.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function StatementTable({ rows }: { rows: StatementRow[] }) {
  if (rows.length === 0) return <EmptyState title="No posted balances" message="Posted journals will appear here after accounting transactions are posted." />;
  return <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse" }}><thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Account", "Debit", "Credit", "Balance"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.accountCode} style={{ borderTop: "1px solid #eaecf0" }}><td style={{ padding: 12 }}><Link href={`/accounting/general-ledger?account=${encodeURIComponent(row.accountCode)}`} title="Open account ledger">{row.accountCode} - {row.accountName}</Link></td><td style={{ padding: 12 }}>{money(row.debit)}</td><td style={{ padding: 12 }}>{money(row.credit)}</td><td style={{ padding: 12 }}>{money(row.balance)}</td></tr>)}</tbody></table></div>;
}

export default function FinancialStatementsLivePage({ rows }: { rows: StatementRow[] }) {
  const income = rows.filter((row) => row.accountType === "INCOME");
  const expenses = rows.filter((row) => row.accountType === "EXPENSE");
  const balanceSheet = rows.filter((row) => ["ASSET", "LIABILITY", "EQUITY"].includes(row.accountType));
  const profit = income.reduce((sum, row) => sum - row.balance, 0) + expenses.reduce((sum, row) => sum - row.balance, 0);

  const exportRows = rows.map((row) => ({ AccountCode: row.accountCode, Account: row.accountName, Type: row.accountType, Debit: row.debit, Credit: row.credit, Balance: row.balance }));

  return <div className="print-content" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
    <PageHeader title="Financial Statements" subtitle="P&L and balance sheet views built from posted journal lines" breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Financial Statements" }]} actions={<div style={{ display: "flex", gap: 8 }}><ReportExportActions fileName="financial-statements" reportTitle="Financial Statements" generatedAt={new Date().toISOString()} rows={exportRows} /><Link href="/accounting/journals" style={{ padding: "10px 14px", border: "1px solid #d0d5dd", borderRadius: 10, textDecoration: "none", color: "#101828" }}>Journal Register</Link></div>} />
    <FormCard title={`Profit & Loss | Net Result: ETB ${money(profit)}`} variant="teal-header"><h3>Income</h3><StatementTable rows={income} /><h3 style={{ marginTop: 24 }}>Expenses</h3><StatementTable rows={expenses} /></FormCard>
    <FormCard title="Balance Sheet" variant="teal-header"><StatementTable rows={balanceSheet} /></FormCard>
  </div>;
}
