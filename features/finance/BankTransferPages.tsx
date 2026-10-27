"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightLeft, Eye, RotateCcw } from "lucide-react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import { publicViewUrl } from "@/lib/routing";
import type { BankTransferRecord } from "@/services/finance/bank-transfer.service";
import type { BadgeVariant } from "@/components/ui/badges";

type BankOption = { id: string; label: string; currency: string; currentBalance: number };

const fieldStyle = { width: "100%", padding: "11px 12px", border: "1px solid #94a3b8", borderRadius: 10, background: "white" };
const buttonStyle = { padding: "11px 16px", border: 0, borderRadius: 10, background: "#00897b", color: "white", fontWeight: 700, cursor: "pointer" };
const transferBadge = (status: string): BadgeVariant => status === "POSTED" ? "posted" : status === "REVERSED" ? "voided" : status === "CANCELLED" ? "rejected" : "draft";

export function BankTransferListPage({ rows }: { rows: BankTransferRecord[] }) {
  return <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
    <PageHeader title="Bank Transfers" subtitle="Posted treasury transfers and immutable reversals." breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Bank Transfers" }]} actions={<Link href="/finance/banks/transfer" style={{ ...buttonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}><ArrowRightLeft size={17} /> New Transfer</Link>} />
    <FormCard title="Transfer Register" variant="teal-header">
      {rows.length === 0 ? <EmptyState title="No bank transfers" message="Posted inter-account transfers will appear here." /> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
        <thead><tr style={{ textAlign: "left", background: "#f8fafc" }}>{["Date", "Transfer No", "From", "To", "Amount", "Reference", "Status", "Action"].map((label) => <th key={label} style={{ padding: 12 }}>{label}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={row.id} style={{ borderTop: "1px solid #eaecf0" }}><td style={{ padding: 12 }}>{new Date(row.transferDate).toLocaleDateString("en-ET")}</td><td style={{ padding: 12 }}>{row.transferNo}</td><td style={{ padding: 12 }}>{row.fromAccount}</td><td style={{ padding: 12 }}>{row.toAccount}</td><td style={{ padding: 12 }}>{row.currency} {row.amount.toLocaleString("en-ET", { minimumFractionDigits: 2 })}</td><td style={{ padding: 12 }}>{row.referenceNo ?? "-"}</td><td style={{ padding: 12 }}><StatusBadge status={transferBadge(row.status)} /></td><td style={{ padding: 12 }}><Link href={publicViewUrl("finance.transfer", row.publicId)} title="View transfer" aria-label="View transfer"><Eye size={18} /></Link></td></tr>)}</tbody>
      </table></div>}
    </FormCard>
  </div>;
}

export function BankTransferCreatePage({ accounts }: { accounts: BankOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ transferDate: new Date().toISOString().slice(0, 10), fromBankAccountId: "", toBankAccountId: "", amount: "", referenceNo: "", remarks: "" });
  const selectedFrom = accounts.find((account) => account.id === form.fromBankAccountId);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    try {
      const response = await fetch("/api/finance/bank-transfers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Failed to post transfer");
      router.push(publicViewUrl("finance.transfer", payload.item.publicId)); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Failed to post transfer"); } finally { setPending(false); }
  }

  return <form onSubmit={submit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
    <PageHeader title="New Bank Transfer" subtitle="Move posted funds between same-currency bank accounts." breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Bank Transfers", href: "/finance/bank-transfers" }, { label: "Create" }]} />
    <FormCard title="Transfer Details" variant="teal-header">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <label>Transfer Date<input type="date" required value={form.transferDate} onChange={(e) => setForm({ ...form, transferDate: e.target.value })} style={fieldStyle} /></label>
        <label>From Account<select required value={form.fromBankAccountId} onChange={(e) => setForm({ ...form, fromBankAccountId: e.target.value })} style={fieldStyle}><option value="">Select ...</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.label} | {account.currency} {account.currentBalance.toLocaleString("en-ET")}</option>)}</select></label>
        <label>To Account<select required value={form.toBankAccountId} onChange={(e) => setForm({ ...form, toBankAccountId: e.target.value })} style={fieldStyle}><option value="">Select ...</option>{accounts.filter((account) => account.id !== form.fromBankAccountId).map((account) => <option key={account.id} value={account.id}>{account.label} | {account.currency}</option>)}</select></label>
        <label>Amount ({selectedFrom?.currency ?? "ETB"})<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={fieldStyle} /></label>
        <label>Reference Number<input value={form.referenceNo} onChange={(e) => setForm({ ...form, referenceNo: e.target.value })} style={fieldStyle} /></label>
      </div>
      <label style={{ display: "block", marginTop: 16 }}>Remarks<textarea value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} style={{ ...fieldStyle, minHeight: 100 }} /></label>
      {error && <p style={{ color: "#b42318" }}>{error}</p>}
    </FormCard>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}><Link href="/finance/bank-transfers" style={{ ...buttonStyle, background: "white", color: "#344054", border: "1px solid #d0d5dd", textDecoration: "none" }}>Cancel</Link><button type="submit" disabled={pending} style={buttonStyle}>{pending ? "Posting..." : "Post Transfer"}</button></div>
  </form>;
}

export function BankTransferDetailPage({ transfer }: { transfer: BankTransferRecord }) {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState("");
  async function reverse() {
    const reason = window.prompt("Enter the bank transfer reversal reason:")?.trim(); if (!reason) return;
    setPending(true); setError("");
    try { const response = await fetch(`/api/finance/bank-transfers/${transfer.id}/reverse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error ?? "Failed to reverse transfer"); router.refresh(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Failed to reverse transfer"); } finally { setPending(false); }
  }
  return <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
    <PageHeader recordKind="finance.transfer" title={transfer.transferNo} subtitle="Bank transfer source document and accounting trace." breadcrumbs={[{ label: "Finance", href: "/finance" }, { label: "Bank Transfers", href: "/finance/bank-transfers" }, { label: transfer.transferNo }]} actions={transfer.status === "POSTED" ? <button onClick={reverse} disabled={pending} style={{ ...buttonStyle, background: "#b42318", display: "inline-flex", gap: 8 }}><RotateCcw size={17} /> {pending ? "Reversing..." : "Reverse"}</button> : undefined} />
    <FormCard title="Transfer Information" variant="teal-header"><dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}><div><dt>Date</dt><dd>{new Date(transfer.transferDate).toLocaleDateString("en-ET")}</dd></div><div><dt>Status</dt><dd><StatusBadge status={transferBadge(transfer.status)} /></dd></div><div><dt>From</dt><dd>{transfer.fromAccount}</dd></div><div><dt>To</dt><dd>{transfer.toAccount}</dd></div><div><dt>Amount</dt><dd>{transfer.currency} {transfer.amount.toLocaleString("en-ET", { minimumFractionDigits: 2 })}</dd></div><div><dt>Reference</dt><dd>{transfer.referenceNo ?? "-"}</dd></div></dl>{transfer.remarks && <p>{transfer.remarks}</p>}{transfer.reversalReason && <p style={{ color: "#b42318" }}>Reversal: {transfer.reversalReason}</p>}{error && <p style={{ color: "#b42318" }}>{error}</p>}</FormCard>
    <FormCard title="Accounting"><Link href={`/accounting/general-ledger?account=${encodeURIComponent(transfer.fromAccount.split(" - ")[0])}`}>Open source account ledger</Link></FormCard>
  </div>;
}
