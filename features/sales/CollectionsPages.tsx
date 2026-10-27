"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Pencil, UserRoundCog } from "lucide-react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type { User } from "@/features/administration/types";
import type { Customer } from "@/features/master-data/types";
import type { OpenSalesInvoiceOption } from "@/services/sales/accounts-receivable.service";
import type { CollectionFollowUpRow, OverdueCustomerRow } from "@/services/sales/collections.service";

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 1080,
  borderCollapse: "separate",
  borderSpacing: 0,
};

const headStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0 12px 14px",
  fontSize: 13,
  fontWeight: 800,
  color: "#667085",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const cellStyle: React.CSSProperties = {
  padding: "16px 12px",
  borderTop: "1px solid #eaecf0",
  verticalAlign: "top",
  color: "#101828",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: "#667085",
  fontSize: 13,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1px solid #94a3b8",
  borderRadius: 14,
  backgroundColor: "#ffffff",
  fontSize: 16,
  color: "#101828",
  boxSizing: "border-box",
};

const primaryButtonStyle: React.CSSProperties = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "none",
  background: "#0f766e",
  color: "#ffffff",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

export function CollectionsOverduePage({
  items,
  currencyCode,
}: {
  items: OverdueCustomerRow[];
  currencyCode: string;
}) {
  const overdue = items.reduce((sum, item) => sum + Number(item.overdueBalance ?? 0), 0);
  const promisedCount = items.filter((item) => item.latestPromisedPaymentDate).length;
  const invoiceCount = items.reduce((sum, item) => sum + Number(item.invoiceCount ?? 0), 0);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        title="Overdue Customers"
        subtitle="Collection worklist driven from posted sales invoices with overdue balances."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Collections" },
          { label: "Overdue" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Overdue Customers</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{items.length}</div>
        </div>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Overdue Invoices</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{invoiceCount}</div>
        </div>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Overdue Balance</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#d92d20" }}>{formatCurrency(overdue, currencyCode)}</div>
        </div>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Promised Payments</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{promisedCount}</div>
        </div>
      </div>

      <FormCard title="Overdue Worklist">
        {!items.length ? (
          <EmptyState title="No overdue customers" message="All visible customers are current on their posted invoices." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Customer", "Location", "Open Invoices", "Overdue Balance", "Oldest Due", "Oldest Age", "Last Follow-up", "Promised Payment"].map((label) => (
                    <th key={label} style={headStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.customerId}-${item.locationId}`}>
                    <td style={cellStyle}>{item.customerCode} - {item.customerName}</td>
                    <td style={cellStyle}>{item.locationCode} - {item.locationName}</td>
                    <td style={cellStyle}>{item.invoiceCount}</td>
                    <td style={cellStyle}>{formatCurrency(item.overdueBalance, currencyCode)}</td>
                    <td style={cellStyle}>{item.oldestDueDate ? formatDate(item.oldestDueDate, "short") : "Not set"}</td>
                    <td style={cellStyle}>{item.oldestAgeDays} days</td>
                    <td style={cellStyle}>{item.latestFollowUpStatus ? item.latestFollowUpStatus : "No follow-up"}</td>
                    <td style={cellStyle}>
                      {item.latestPromisedPaymentDate
                        ? `${formatDate(item.latestPromisedPaymentDate, "short")} / ${formatCurrency(item.latestPromisedAmount ?? 0, currencyCode)}`
                        : "No promise"}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...cellStyle, fontWeight: 800 }} colSpan={3}>Total</td>
                  <td style={{ ...cellStyle, fontWeight: 800 }}>{formatCurrency(overdue, currencyCode)}</td>
                  <td style={cellStyle} colSpan={4}></td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}

export function CollectionsFollowUpsPage({
  items,
  customers,
  openInvoices,
  users,
  currencyCode,
  initialEditId,
}: {
  items: CollectionFollowUpRow[];
  customers: Customer[];
  openInvoices: OpenSalesInvoiceOption[];
  users: User[];
  currencyCode: string;
  initialEditId?: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const initialEditItem = items.find((item) => item.id === initialEditId);
  const [editingId, setEditingId] = useState<string | null>(initialEditItem?.id ?? null);
  const [form, setForm] = useState({
    customerId: initialEditItem?.customerId ?? "",
    salesInvoiceId: initialEditItem?.salesInvoiceId ?? "",
    followUpDate: initialEditItem?.followUpDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    status: initialEditItem?.status ?? "OPEN",
    promisedPaymentDate: initialEditItem?.promisedPaymentDate?.slice(0, 10) ?? "",
    promisedAmount: initialEditItem?.promisedAmount != null ? String(initialEditItem.promisedAmount) : "",
    assignedToId: initialEditItem?.assignedToId ?? "",
    notes: initialEditItem?.notes ?? "",
  });

  const filteredInvoices = openInvoices.filter((invoice) => !form.customerId || invoice.customerId === form.customerId);

  function resetForm() {
    setEditingId(null);
    setForm({
      customerId: "",
      salesInvoiceId: "",
      followUpDate: new Date().toISOString().slice(0, 10),
      status: "OPEN",
      promisedPaymentDate: "",
      promisedAmount: "",
      assignedToId: "",
      notes: "",
    });
  }

  function loadForEdit(item: CollectionFollowUpRow) {
    setEditingId(item.id);
    setMessage("");
    setForm({
      customerId: item.customerId,
      salesInvoiceId: item.salesInvoiceId ?? "",
      followUpDate: item.followUpDate.slice(0, 10),
      status: item.status,
      promisedPaymentDate: item.promisedPaymentDate?.slice(0, 10) ?? "",
      promisedAmount: item.promisedAmount != null ? String(item.promisedAmount) : "",
      assignedToId: item.assignedToId ?? "",
      notes: item.notes ?? "",
    });
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(editingId ? `/api/sales/collections/follow-ups/${editingId}` : "/api/sales/collections/follow-ups", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          salesInvoiceId: form.salesInvoiceId || null,
          promisedPaymentDate: form.promisedPaymentDate || null,
          promisedAmount: form.promisedAmount ? Number(form.promisedAmount) : null,
          assignedToId: form.assignedToId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? `Failed to ${editingId ? "update" : "save"} collection follow-up`);
        return;
      }
      router.refresh();
      resetForm();
    });
  }

  function closeFollowUp(item: CollectionFollowUpRow) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/sales/collections/follow-ups/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: item.customerId,
          salesInvoiceId: item.salesInvoiceId ?? null,
          followUpDate: item.followUpDate.slice(0, 10),
          status: "CLOSED",
          promisedPaymentDate: item.promisedPaymentDate ?? null,
          promisedAmount: item.promisedAmount ?? null,
          assignedToId: item.assignedToId ?? null,
          notes: item.notes ?? "Closed from collections work queue",
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Failed to close collection follow-up");
        return;
      }
      router.refresh();
      if (editingId === item.id) {
        resetForm();
      }
    });
  }

  const openCount = items.filter((item) => item.status === "OPEN").length;
  const promisedCount = items.filter((item) => item.status === "PROMISED").length;
  const closedCount = items.filter((item) => item.status === "CLOSED").length;

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        title="Collections Follow-ups"
        subtitle="Track collector notes, follow-up status, and promised payments against real receivables."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Collections" },
          { label: "Follow-ups" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Open</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{openCount}</div>
        </div>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Promised</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{promisedCount}</div>
        </div>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Closed</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#027a48" }}>{closedCount}</div>
        </div>
        <div style={{ borderRadius: 18, padding: 18, background: "#ffffff", border: "1px solid #e4e7ec" }}>
          <div style={labelStyle}>Register</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{items.length}</div>
        </div>
      </div>

      <FormCard title={editingId ? "Edit Follow-up" : "Log Follow-up"} variant="teal-header">
        {message ? <div style={{ color: "#d92d20", fontWeight: 700 }}>{message}</div> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Customer</label>
            <select style={inputStyle} value={form.customerId} onChange={(event) => setForm((current) => ({ ...current, customerId: event.target.value, salesInvoiceId: "" }))}>
              <option value="">Select ...</option>
              {customers.filter((customer) => customer.isActive).map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.customerCode} - {customer.name}</option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Sales Invoice</label>
            <select style={inputStyle} value={form.salesInvoiceId} onChange={(event) => setForm((current) => ({ ...current, salesInvoiceId: event.target.value }))}>
              <option value="">General customer follow-up</option>
              {filteredInvoices.map((invoice) => (
                <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNo} - {invoice.locationCode} - {formatCurrency(invoice.balanceDue, currencyCode)}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Follow-up Date</label>
            <input type="date" style={inputStyle} value={form.followUpDate} onChange={(event) => setForm((current) => ({ ...current, followUpDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
              <option value="OPEN">Open</option>
              <option value="CONTACTED">Contacted</option>
              <option value="PROMISED">Promised</option>
              <option value="ESCALATED">Escalated</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Promised Payment Date</label>
            <input type="date" style={inputStyle} value={form.promisedPaymentDate} onChange={(event) => setForm((current) => ({ ...current, promisedPaymentDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Promised Amount ({currencyCode})</label>
            <input type="number" min="0" step="0.01" style={inputStyle} value={form.promisedAmount} onChange={(event) => setForm((current) => ({ ...current, promisedAmount: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Assigned To</label>
            <select style={inputStyle} value={form.assignedToId} onChange={(event) => setForm((current) => ({ ...current, assignedToId: event.target.value }))}>
              <option value="">Unassigned</option>
              {users.filter((user) => user.isActive).map((user) => (
                <option key={user.id} value={user.id}>{user.name} - {user.email}</option>
              ))}
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Collector Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 96, resize: "vertical" }} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Outcome, next step, collector notes" />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18, gap: 12, flexWrap: "wrap" }}>
          {editingId ? (
            <button type="button" style={{ ...primaryButtonStyle, background: "#ffffff", color: "#344054", border: "1px solid #d0d5dd" }} onClick={resetForm} disabled={isPending}>
              Cancel Edit
            </button>
          ) : null}
          <button type="button" style={primaryButtonStyle} onClick={submit} disabled={isPending}>
            {isPending ? "Saving..." : editingId ? "Update Follow-up" : "Save Follow-up"}
          </button>
        </div>
      </FormCard>

      <FormCard title="Follow-up Register">
        {!items.length ? (
          <EmptyState title="No collection follow-ups yet" message="Log the first collector note or promised payment against overdue receivables." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Date", "Customer", "Invoice", "Status", "Assigned", "Promised Payment", "Notes", "Actions"].map((label) => (
                    <th key={label} style={headStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>{formatDate(item.followUpDate, "short")}</td>
                    <td style={cellStyle}>{item.customerCode} - {item.customerName}</td>
                    <td style={cellStyle}>{item.invoiceNo ?? "General follow-up"}</td>
                    <td style={cellStyle}><StatusBadge status="pending" /> <span style={{ marginLeft: 8 }}>{item.status}</span></td>
                    <td style={cellStyle}>{item.assignedToName ?? "Unassigned"}</td>
                    <td style={cellStyle}>
                      {item.promisedPaymentDate
                        ? `${formatDate(item.promisedPaymentDate, "short")} / ${formatCurrency(item.promisedAmount ?? 0, currencyCode)}`
                        : "No promise"}
                    </td>
                    <td style={cellStyle}>{item.notes ?? "No notes"}</td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button
                          type="button"
                          title="Edit follow-up"
                          aria-label={`Edit follow-up for ${item.customerCode}`}
                          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          onClick={() => loadForEdit(item)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          title="Assign or reassign"
                          aria-label={`Reassign follow-up for ${item.customerCode}`}
                          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          onClick={() => loadForEdit(item)}
                        >
                          <UserRoundCog size={16} />
                        </button>
                        {item.status !== "CLOSED" ? (
                          <button
                            type="button"
                            title="Close follow-up"
                            aria-label={`Close follow-up for ${item.customerCode}`}
                            style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #abefc6", background: "#ecfdf3", color: "#067647", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                            onClick={() => closeFollowUp(item)}
                            disabled={isPending}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}
