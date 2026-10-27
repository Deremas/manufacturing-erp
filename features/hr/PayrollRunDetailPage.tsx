"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, CheckCircle2, Printer, Send, WalletCards, XCircle } from "lucide-react";

import { ActionButtons, DataTable, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { Action, Breadcrumb, Column } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { publicPrintUrl } from "@/lib/routing/urls";
import type { PayrollEmployeeLine, PayrollRun } from "./types";

async function changeStatus(id: string, action: "submit" | "approve" | "post" | "pay" | "cancel", bankAccountId?: string) {
  const response = await fetch(`/api/hr/payroll/${id}/actions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, bankAccountId }),
  });

  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(payload?.error ?? "Failed to update payroll run.");
  }
}

export default function PayrollRunDetailPage({
  payroll,
  employees,
  bankAccounts,
}: {
  payroll: PayrollRun | null;
  employees: PayrollEmployeeLine[];
  bankAccounts: Array<{ id: string; label: string; currency: string; currentBalance: number }>;
}) {
  const router = useRouter();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? "");

  const breadcrumbs: Breadcrumb[] = [
    { label: "HR", href: "/hr" },
    { label: "Payroll", href: "/hr/payroll" },
    { label: payroll?.payrollNo ?? "Detail" },
  ];

  if (!payroll) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <PageHeader title="Payroll Run" subtitle="Review employee payroll calculations, approvals, and posting state." breadcrumbs={breadcrumbs} />
        <FormCard title="Payroll Run" variant="teal-header">
          <div style={{ color: colors.text.secondary }}>Payroll run not found.</div>
        </FormCard>
      </div>
    );
  }

  const runAction = async (action: "submit" | "approve" | "post" | "pay" | "cancel") => {
    try {
      setError("");
      setBusyAction(action);
      await changeStatus(payroll.id, action, action === "pay" ? bankAccountId : undefined);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update payroll run.");
    } finally {
      setBusyAction(null);
    }
  };

  const actions: Action[] = [
    {
      label: "Print",
      variant: "secondary",
      icon: <Printer size={16} />,
      onClick: () => router.push(publicPrintUrl("hr.payroll", payroll.publicId)),
    },
    {
      label: "Submit",
      variant: "secondary",
      icon: <Send size={16} />,
      onClick: () => { void runAction("submit"); },
      loading: busyAction === "submit",
      disabled: payroll.status !== "DRAFT",
    },
    {
      label: "Approve",
      variant: "primary",
      icon: <CheckCircle2 size={16} />,
      onClick: () => { void runAction("approve"); },
      loading: busyAction === "approve",
      disabled: !["DRAFT", "SUBMITTED"].includes(payroll.status),
    },
    {
      label: "Post",
      variant: "primary",
      icon: <WalletCards size={16} />,
      onClick: () => { void runAction("post"); },
      loading: busyAction === "post",
      disabled: payroll.status !== "APPROVED",
    },
    {
      label: "Cancel",
      variant: "danger",
      icon: <XCircle size={16} />,
      onClick: () => { void runAction("cancel"); },
      loading: busyAction === "cancel",
      disabled: ["POSTED", "CANCELLED"].includes(payroll.status),
    },
    {
      label: "Pay Payroll",
      variant: "success",
      icon: <Banknote size={16} />,
      onClick: () => { void runAction("pay"); },
      loading: busyAction === "pay",
      disabled: payroll.status !== "POSTED" || Boolean(payroll.paymentJournalId) || !bankAccountId,
    },
  ];

  const columns: Column<PayrollEmployeeLine>[] = [
    { key: "employeeNo", label: "Employee No", sortable: true },
    { key: "employeeName", label: "Employee", sortable: true },
    { key: "locationName", label: "Location" },
    { key: "baseSalary", label: "Base Salary", render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: "overtimeAmount", label: "OT", render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: "incomeTax", label: "Tax", render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: "pensionEmployee", label: "Emp Pension", render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: "netPay", label: "Net Pay", render: (value) => Number(value ?? 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        recordKind="hr.payroll"
        title={payroll.payrollNo}
        subtitle="Review the payroll calculation snapshot before approval and posting."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {error ? <div style={{ padding: "12px 14px", borderRadius: 12, border: `1px solid ${colors.danger[200]}`, backgroundColor: colors.danger[50], color: colors.danger[700] }}>{error}</div> : null}

      <FormCard title="Payroll Summary" variant="teal-header">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Period Start</div><div>{new Date(payroll.periodStart).toLocaleDateString("en-KE")}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Period End</div><div>{new Date(payroll.periodEnd).toLocaleDateString("en-KE")}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Payment Date</div><div>{new Date(payroll.paymentDate).toLocaleDateString("en-KE")}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Status</div><div><StatusBadge status={payroll.status === "APPROVED" || payroll.status === "POSTED" ? "approved" : payroll.status === "SUBMITTED" ? "pending" : payroll.status === "CANCELLED" ? "rejected" : "draft"} /></div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Employees</div><div>{payroll.employeeCount}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Gross Pay</div><div>{payroll.grossPay.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Deductions</div><div>{payroll.totalDeductions.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Net Pay</div><div>{payroll.netPay.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div></div>
          <div><div style={{ color: colors.text.secondary, fontSize: 12 }}>Payment</div><div>{payroll.paymentJournalNo ? `Paid - ${payroll.paymentJournalNo}` : "Not paid"}</div></div>
        </div>
      </FormCard>

      {payroll.status === "POSTED" ? <FormCard title="Payroll Payment" variant="default">
        {payroll.paymentJournalId ? <div style={{ color: colors.success[700], fontWeight: 700 }}>Paid on {payroll.paidAt ? new Date(payroll.paidAt).toLocaleString("en-KE") : "posted date"} through journal {payroll.paymentJournalNo}.</div> : <label style={{ display: "grid", gap: 7, maxWidth: 520 }}><span style={{ color: colors.text.secondary, fontSize: 13, fontWeight: 650 }}>Payment Bank Account</span><select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} style={{ height: 48, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "0 12px", background: "#fff" }}><option value="">Select ...</option>{bankAccounts.map((account) => <option key={account.id} value={account.id}>{account.label} - Balance {account.currentBalance.toLocaleString("en-KE", { minimumFractionDigits: 2 })}</option>)}</select></label>}
      </FormCard> : null}

      <DataTable columns={columns} data={employees} recordCount={employees.length} />
    </div>
  );
}
