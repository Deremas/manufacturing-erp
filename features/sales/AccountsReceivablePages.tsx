"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Eye, Pencil, Printer } from "lucide-react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import type { Location } from "@/features/administration/types";
import type { BankAccount, Customer } from "@/features/master-data/types";
import { ActionReasonDialog } from "@/features/sales/components/ActionReasonDialog";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type {
  AccountsReceivableAgingRow,
  AccountsReceivableCustomerSummaryRow,
  CustomerStatement,
  CustomerReceiptDetail,
  CustomerReceiptSummary,
  OpenSalesInvoiceOption,
} from "@/services/sales/accounts-receivable.service";

const shellStyle: React.CSSProperties = {
  padding: 24,
  display: "flex",
  flexDirection: "column",
  gap: 24,
  background: "#f8fafc",
};

const metricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const metricCardStyle: React.CSSProperties = {
  borderRadius: 18,
  padding: 18,
  background: "#ffffff",
  border: "1px solid #e4e7ec",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 1040,
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

const readonlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: "#f8fafc",
};

const addButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  height: 32,
  padding: "0 12px",
  border: "none",
  borderRadius: 6,
  background: "#0f766e",
  color: "white",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  width: "fit-content",
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

const secondaryButtonStyle: React.CSSProperties = {
  height: 48,
  padding: "0 18px",
  borderRadius: 14,
  border: "1px solid #d0d5dd",
  background: "#ffffff",
  color: "#344054",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  height: 44,
  borderRadius: 14,
  border: "1px solid #fda29b",
  background: "#fef3f2",
  color: "#d92d20",
  fontSize: 18,
  fontWeight: 800,
  cursor: "pointer",
};

type ReceiptAllocationLine = {
  id: string;
  salesInvoiceId: string;
  amount: number;
};

type AllocationComparisonRow = {
  key: string;
  invoiceLabel: string;
  oldAmount: number;
  newAmount: number;
};

function toBadgeStatus(value: string): BadgeVariant {
  const normalized = String(value ?? "").trim().toLowerCase();
  switch (normalized) {
    case "active":
    case "inactive":
    case "pending":
    case "approved":
    case "rejected":
    case "posted":
    case "voided":
    case "draft":
    case "completed":
      return normalized;
    case "paid":
      return "posted";
    case "partial":
      return "pending";
    case "unpaid":
      return "draft";
    case "cancelled":
      return "voided";
    default:
      return "draft";
  }
}

function createAllocationLine(): ReceiptAllocationLine {
  return {
    id: crypto.randomUUID(),
    salesInvoiceId: "",
    amount: 0,
  };
}

export function AccountsReceivableAgingPage({
  rows,
  currencyCode,
}: {
  rows: AccountsReceivableAgingRow[];
  currencyCode: string;
}) {
  const totals = rows.reduce(
    (sum, row) => ({
      balanceDue: sum.balanceDue + Number(row.balanceDue ?? 0),
      current: sum.current + Number(row.currentBucket ?? 0),
      overdue:
        sum.overdue +
        Number(row.bucket1To30 ?? 0) +
        Number(row.bucket31To60 ?? 0) +
        Number(row.bucket61To90 ?? 0) +
        Number(row.bucketOver90 ?? 0),
    }),
    { balanceDue: 0, current: 0, overdue: 0 },
  );

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Accounts Receivable Aging"
        subtitle="Outstanding customer balances sourced from posted commercial sales invoices."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "AR Aging" },
        ]}
      />

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Open Invoices</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{rows.length}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Outstanding AR</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{formatCurrency(totals.balanceDue, currencyCode)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Current</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{formatCurrency(totals.current, currencyCode)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Overdue</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#d92d20" }}>{formatCurrency(totals.overdue, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="AR Aging Register">
        {!rows.length ? (
          <EmptyState title="No receivables open" message="Posted invoices with unpaid balances will appear here." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, minWidth: 1320 }}>
              <thead>
                <tr>
                  {["Customer", "Invoice", "Date", "Due", "Channel", "Location", "Balance", "Current", "1-30", "31-60", "61-90", ">90", "Age Days"].map((label) => (
                    <th key={label} style={headStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.invoiceId}>
                    <td style={cellStyle}>{row.customerCode} - {row.customerName}</td>
                    <td style={cellStyle}>
                      <Link href={`/sales/invoices/${row.invoiceId}`} style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}>
                        {row.invoiceNo}
                      </Link>
                    </td>
                    <td style={cellStyle}>{formatDate(row.invoiceDate, "short")}</td>
                    <td style={cellStyle}>{row.dueDate ? formatDate(row.dueDate, "short") : "Not set"}</td>
                    <td style={cellStyle}>{row.channel}</td>
                    <td style={cellStyle}>{row.locationCode} - {row.locationName}</td>
                    <td style={cellStyle}>{formatCurrency(row.balanceDue, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(row.currentBucket, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(row.bucket1To30, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(row.bucket31To60, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(row.bucket61To90, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(row.bucketOver90, currencyCode)}</td>
                    <td style={cellStyle}>{row.ageDays}</td>
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

export function AccountsReceivableSummaryPage({
  rows,
  currencyCode,
}: {
  rows: AccountsReceivableCustomerSummaryRow[];
  currencyCode: string;
}) {
  const totals = rows.reduce(
    (sum, row) => ({
      customers: sum.customers + 1,
      outstanding: sum.outstanding + Number(row.outstandingBalance ?? 0),
      overdue: sum.overdue + Number(row.overdueBalance ?? 0),
      invoices: sum.invoices + Number(row.invoiceCount ?? 0),
    }),
    { customers: 0, outstanding: 0, overdue: 0, invoices: 0 },
  );

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Accounts Receivable Summary"
        subtitle="Customer-level receivable exposure from posted invoices in the visible location scope."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "AR Summary" },
        ]}
      />

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Customers</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{totals.customers}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Open Invoices</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{totals.invoices}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Outstanding</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{formatCurrency(totals.outstanding, currencyCode)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Overdue</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#d92d20" }}>{formatCurrency(totals.overdue, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="Customer Exposure">
        {!rows.length ? (
          <EmptyState title="No customer receivables" message="There are no outstanding posted invoice balances in the current scope." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, minWidth: 1100 }}>
              <thead>
                <tr>
                  {["Customer", "Invoices", "Outstanding", "Current", "Overdue", "Oldest Age", "Statement"].map((label) => (
                    <th key={label} style={headStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.customerId}>
                    <td style={cellStyle}>{row.customerCode} - {row.customerName}</td>
                    <td style={cellStyle}>{row.invoiceCount}</td>
                    <td style={cellStyle}>{formatCurrency(row.outstandingBalance, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(row.currentBucket, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(row.overdueBalance, currencyCode)}</td>
                    <td style={cellStyle}>{row.oldestAgeDays} days</td>
                    <td style={cellStyle}>
                      <Link
                        href={`/sales/reports/customer-statements?customerId=${encodeURIComponent(row.customerId)}`}
                        style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}
                      >
                        Open Statement
                      </Link>
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

export function CustomerReceiptsListPage({
  items,
  currencyCode,
}: {
  items: CustomerReceiptSummary[];
  currencyCode: string;
}) {
  const totals = items.reduce(
    (sum, row) => ({
      received: sum.received + Number(row.amountReceived ?? 0),
      unapplied: sum.unapplied + Number(row.unappliedAmount ?? 0),
    }),
    { received: 0, unapplied: 0 },
  );

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Customer Receipts"
        subtitle="Receipts allocated against posted sales invoices and synced into AR finance postings."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customer Receipts" },
        ]}
        actions={(
          <Link href="/sales/receipts/create" style={{ ...primaryButtonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            Create Receipt
          </Link>
        )}
      />

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Receipts</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{items.length}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Posted Value</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{formatCurrency(totals.received, currencyCode)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Unapplied</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{formatCurrency(totals.unapplied, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="Receipt Register">
        {!items.length ? (
          <EmptyState title="No customer receipts yet" message="Post the first receipt to start settling invoice balances." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ ...tableStyle, minWidth: 1180 }}>
              <thead>
                <tr>
                  {["Receipt No", "Date", "Customer", "Location", "Method", "Reference", "Received", "Unapplied", "Allocations", "Status", "Actions"].map((label) => (
                    <th key={label} style={headStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}><strong>{item.receiptNo}</strong></td>
                    <td style={cellStyle}>{formatDate(item.receiptDate, "short")}</td>
                    <td style={cellStyle}>{item.customerCode && item.customerName ? `${item.customerCode} - ${item.customerName}` : item.customerId}</td>
                    <td style={cellStyle}>{item.locationCode} - {item.locationName}</td>
                    <td style={cellStyle}>{item.paymentMethod}</td>
                    <td style={cellStyle}>{item.referenceNo ?? "Direct receipt"}</td>
                    <td style={cellStyle}>{formatCurrency(item.amountReceived, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(item.unappliedAmount, currencyCode)}</td>
                    <td style={cellStyle}>{item.allocationCount}</td>
                    <td style={cellStyle}><StatusBadge status={toBadgeStatus(item.status)} /></td>
                    <td style={cellStyle}>
                      <Link
                        href={publicViewUrl("sales.receipt", item.publicId)}
                        title="View receipt"
                        aria-label={`View ${item.receiptNo}`}
                        style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #d0d5dd", color: "#344054", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                      >
                        <Eye size={16} />
                      </Link>
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

export function CustomerReceiptDetailPage({
  item,
  currencyCode,
}: {
  item: CustomerReceiptDetail | null;
  currencyCode: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  if (!item) {
    return (
      <div style={shellStyle}>
        <PageHeader
          title="Receipt not found"
          breadcrumbs={[
            { label: "Sales", href: "/sales" },
            { label: "Customer Receipts", href: "/sales/receipts" },
            { label: "Receipt Detail" },
          ]}
        />
        <FormCard title="Missing Record">
          <EmptyState title="Receipt not found" message="The requested receipt was not found or is outside your location access." />
        </FormCard>
      </div>
    );
  }

  const receipt = item;

  function voidReceipt() {
    setMessage("");
    setShowVoidDialog(true);
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="procurement.payment"
        title={item.receiptNo}
        subtitle="Posted receipt with invoice allocations and AR settlement traceability."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customer Receipts", href: "/sales/receipts" },
          { label: item.receiptNo },
        ]}
        actions={(
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/sales/receipts" style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
              Back
            </Link>
            {item.status === "POSTED" ? (
              <Link href={publicEditUrl("sales.receipt", receipt.publicId)} style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                <Pencil size={16} />
                <span>Edit / Reallocate</span>
              </Link>
            ) : null}
            <Link href={publicPrintUrl("sales.receipt", receipt.publicId)} style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
              <Printer size={16} />
              <span>Print</span>
            </Link>
            {item.status === "POSTED" ? (
              <button type="button" onClick={voidReceipt} style={{ ...dangerButtonStyle, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "0 16px" }} disabled={isPending}>
                <Ban size={16} />
                <span>{isPending ? "Voiding..." : "Void Receipt"}</span>
              </button>
            ) : null}
          </div>
        )}
      />

      {message ? <div style={{ color: "#d92d20", fontWeight: 700 }}>{message}</div> : null}

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Customer</div>
          <div style={{ marginTop: 10, fontSize: 20, fontWeight: 800 }}>{receipt.customerCode && receipt.customerName ? `${receipt.customerCode} - ${receipt.customerName}` : receipt.customerId}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Received</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{formatCurrency(receipt.amountReceived, currencyCode)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Unapplied</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{formatCurrency(receipt.unappliedAmount, currencyCode)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={labelStyle}>Status</div>
          <div style={{ marginTop: 10 }}><StatusBadge status={toBadgeStatus(receipt.status)} /></div>
        </div>
      </div>

      <FormCard title="Receipt Summary">
        <div style={fieldGridStyle}>
          <div style={fieldStyle}><span style={labelStyle}>Receipt Date</span><div>{formatDate(receipt.receiptDate, "short")}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Location</span><div>{receipt.locationCode} - {receipt.locationName}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Payment Method</span><div>{receipt.paymentMethod}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Bank Account</span><div>{receipt.bankAccountName ?? "Not required"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Reference</span><div>{receipt.referenceNo ?? "Direct receipt"}</div></div>
          <div style={fieldStyle}><span style={labelStyle}>Posted At</span><div>{receipt.postedAt ? formatDate(receipt.postedAt, "datetime") : "Not posted"}</div></div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><span style={labelStyle}>Remarks</span><div>{receipt.remarks ?? "No remarks"}</div></div>
        </div>
      </FormCard>

      <FormCard title="Invoice Allocations">
        {!receipt.allocations.length ? (
          <EmptyState title="No allocations" message="This receipt has no invoice allocations yet." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Invoice", "Date", "Due", "Channel", "Location", "Allocated"].map((label) => (
                    <th key={label} style={headStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {receipt.allocations.map((allocation) => (
                  <tr key={allocation.id}>
                    <td style={cellStyle}>
                      <Link href={`/sales/invoices/${allocation.salesInvoiceId}`} style={{ color: "#0f766e", textDecoration: "none", fontWeight: 700 }}>
                        {allocation.invoiceNo}
                      </Link>
                    </td>
                    <td style={cellStyle}>{formatDate(allocation.invoiceDate, "short")}</td>
                    <td style={cellStyle}>{allocation.dueDate ? formatDate(allocation.dueDate, "short") : "Not set"}</td>
                    <td style={cellStyle}>{allocation.channel}</td>
                    <td style={cellStyle}>{allocation.locationCode} - {allocation.locationName}</td>
                    <td style={cellStyle}>{formatCurrency(allocation.amount, currencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>

      <ActionReasonDialog
        open={showVoidDialog}
        title={`Void ${receipt.receiptNo}`}
        description="This will void the posted receipt, reverse AR receipt allocations, and keep the audit trail intact."
        confirmLabel="Void Receipt"
        loadingLabel="Voiding..."
        error={message}
        isPending={isPending}
        onClose={() => {
          if (isPending) {
            return;
          }
          setShowVoidDialog(false);
        }}
        onConfirm={(reason) => {
          setMessage("");
          startTransition(async () => {
            const response = await fetch(`/api/sales/receipts/${receipt.id}/void`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason }),
            });
            const result = await response.json();
            if (!response.ok) {
              setMessage(result.error ?? "Failed to void customer receipt");
              return;
            }
            setShowVoidDialog(false);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

export function CustomerReceiptFormPage({
  customers,
  locations,
  bankAccounts,
  openInvoices,
  currencyCode,
  currencyLabel,
  initialInvoiceId,
  initialReceipt,
}: {
  customers: Customer[];
  locations: Location[];
  bankAccounts: BankAccount[];
  openInvoices: OpenSalesInvoiceOption[];
  currencyCode: string;
  currencyLabel: string;
  initialInvoiceId?: string | null;
  initialReceipt?: CustomerReceiptDetail | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEditMode = Boolean(initialReceipt?.id);

  const firstInvoice = initialInvoiceId ? openInvoices.find((invoice) => invoice.id === initialInvoiceId) : null;
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    receiptDate: initialReceipt?.receiptDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    customerId: initialReceipt?.customerId ?? firstInvoice?.customerId ?? "",
    locationId: initialReceipt?.locationId ?? firstInvoice?.locationId ?? locations[0]?.id ?? "",
    paymentMethod: initialReceipt?.paymentMethod ?? "CASH",
    bankAccountId: initialReceipt?.bankAccountId ?? "",
    amountReceived: initialReceipt?.amountReceived ?? firstInvoice?.balanceDue ?? 0,
    referenceNo: initialReceipt?.referenceNo ?? "",
    remarks: initialReceipt?.remarks ?? "",
  });
  const [lines, setLines] = useState<ReceiptAllocationLine[]>(
    initialReceipt?.allocations?.length
      ? initialReceipt.allocations.map((allocation) => ({
          id: allocation.id || crypto.randomUUID(),
          salesInvoiceId: allocation.salesInvoiceId,
          amount: allocation.amount,
        }))
      : firstInvoice
        ? [{ id: crypto.randomUUID(), salesInvoiceId: firstInvoice.id, amount: firstInvoice.balanceDue }]
        : [createAllocationLine()],
  );

  const customerInvoices = useMemo(
    () =>
      openInvoices.filter((invoice) => !header.customerId || invoice.customerId === header.customerId),
    [openInvoices, header.customerId],
  );

  const totalAllocated = useMemo(
    () => Number(lines.reduce((sum, line) => sum + Number(line.amount || 0), 0).toFixed(2)),
    [lines],
  );

  const unappliedAmount = Number((Number(header.amountReceived || 0) - totalAllocated).toFixed(2));
  const originalAllocations = useMemo(
    () =>
      (initialReceipt?.allocations ?? []).map((allocation) => ({
        salesInvoiceId: allocation.salesInvoiceId,
        amount: Number(allocation.amount ?? 0),
      })),
    [initialReceipt],
  );
  const allocationComparison = useMemo<AllocationComparisonRow[]>(() => {
    if (!isEditMode) {
      return [];
    }
    const oldMap = new Map(originalAllocations.map((allocation) => [allocation.salesInvoiceId, allocation.amount]));
    const newMap = new Map(
      lines
        .filter((line) => line.salesInvoiceId)
        .map((line) => [line.salesInvoiceId, Number(line.amount ?? 0)]),
    );
    const invoiceIds = Array.from(new Set([...oldMap.keys(), ...newMap.keys()]));

    return invoiceIds.map((invoiceId) => {
      const openInvoice = openInvoices.find((entry) => entry.id === invoiceId);
      const savedInvoice = initialReceipt?.allocations?.find((entry) => entry.salesInvoiceId === invoiceId);
      const invoiceLabel = openInvoice
        ? `${openInvoice.invoiceNo} - ${openInvoice.locationCode}`
        : savedInvoice?.invoiceNo ?? `Invoice ${invoiceId}`;

      return {
        key: invoiceId,
        invoiceLabel,
        oldAmount: Number(oldMap.get(invoiceId) ?? 0),
        newAmount: Number(newMap.get(invoiceId) ?? 0),
      };
    });
  }, [initialReceipt, isEditMode, lines, openInvoices, originalAllocations]);
  const requiresBank =
    header.paymentMethod === "BANK" ||
    header.paymentMethod === "CHEQUE" ||
    header.paymentMethod === "MOBILE_MONEY";

  function upsertLine(index: number, patch: Partial<ReceiptAllocationLine>) {
    setLines((current) =>
      current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)),
    );
  }

  function applyInvoice(index: number, invoiceId: string) {
    const duplicate = lines.find((line, lineIndex) => lineIndex !== index && line.salesInvoiceId === invoiceId);
    if (duplicate) {
      setMessage("The same invoice cannot be allocated more than once in one receipt.");
      return;
    }

    const invoice = openInvoices.find((entry) => entry.id === invoiceId);
    if (!invoice) {
      upsertLine(index, { salesInvoiceId: "", amount: 0 });
      return;
    }

    setHeader((current) => ({
      ...current,
      customerId: current.customerId || invoice.customerId,
      locationId: current.locationId || invoice.locationId,
      amountReceived: current.amountReceived > 0 ? current.amountReceived : invoice.balanceDue,
    }));
    upsertLine(index, {
      salesInvoiceId: invoice.id,
      amount: invoice.balanceDue,
    });
  }

  function addLine() {
    setLines((current) => [...current, createAllocationLine()]);
  }

  function removeLine(index: number) {
    setLines((current) => blankOrRemoveRow(current, index, createAllocationLine()));
  }

  function selectedInvoice(line: ReceiptAllocationLine) {
    return openInvoices.find((invoice) => invoice.id === line.salesInvoiceId) ?? null;
  }

  function submit() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(isEditMode ? `/api/sales/receipts/${initialReceipt?.id}` : "/api/sales/receipts", {
        method: isEditMode ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...header,
          bankAccountId: requiresBank ? header.bankAccountId || null : null,
          amountReceived: Number(header.amountReceived || 0),
          allocations: lines
            .filter((line) => line.salesInvoiceId && Number(line.amount || 0) > 0)
            .map((line) => ({
              salesInvoiceId: line.salesInvoiceId,
              amount: Number(line.amount || 0),
            })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? `Failed to ${isEditMode ? "update" : "create"} customer receipt`);
        return;
      }
      router.push(publicViewUrl("sales.receipt", result.item.publicId));
    });
  }

  return (
    <div style={shellStyle}>
      <PageHeader
        title={isEditMode ? "Edit Customer Receipt" : "Create Customer Receipt"}
        subtitle={isEditMode ? "Reallocate a posted customer receipt with a strict invoice audit trail." : "Allocate a posted customer receipt against one or more open sales invoices."}
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customer Receipts", href: "/sales/receipts" },
          { label: isEditMode ? "Edit" : "Create" },
        ]}
      />

      {message ? <div style={{ color: "#d92d20", fontWeight: 700 }}>{message}</div> : null}

      <FormCard title="Receipt Header" variant="teal-header">
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Receipt Date</label>
            <input
              type="date"
              style={inputStyle}
              value={header.receiptDate}
              onChange={(event) => setHeader((current) => ({ ...current, receiptDate: event.target.value }))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Customer</label>
            <select
              style={inputStyle}
              value={header.customerId}
              onChange={(event) => setHeader((current) => ({ ...current, customerId: event.target.value }))}
            >
              <option value="">Select ...</option>
              {customers.filter((customer) => customer.isActive).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customerCode} - {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Receipt Location</label>
            <select
              style={inputStyle}
              value={header.locationId}
              onChange={(event) => setHeader((current) => ({ ...current, locationId: event.target.value }))}
            >
              <option value="">Select ...</option>
              {locations.filter((location) => location.isActive).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode} - {location.locationName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Payment Method</label>
            <select
              style={inputStyle}
              value={header.paymentMethod}
              onChange={(event) => setHeader((current) => ({ ...current, paymentMethod: event.target.value }))}
            >
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="CHEQUE">Cheque</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Bank Account</label>
            <select
              style={requiresBank ? inputStyle : readonlyInputStyle}
              value={header.bankAccountId}
              onChange={(event) => setHeader((current) => ({ ...current, bankAccountId: event.target.value }))}
              disabled={!requiresBank}
            >
              <option value="">{requiresBank ? "Select ..." : "Not required"}</option>
              {bankAccounts.filter((account) => account.isActive).map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountCode} - {account.accountName}
                </option>
              ))}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Amount Received ({currencyCode})</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.01"
              value={header.amountReceived}
              onChange={(event) => setHeader((current) => ({ ...current, amountReceived: Number(event.target.value || 0) }))}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Reference No</label>
            <input
              style={inputStyle}
              value={header.referenceNo}
              onChange={(event) => setHeader((current) => ({ ...current, referenceNo: event.target.value }))}
              placeholder="Optional reference"
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea
              style={{ ...inputStyle, minHeight: 96, resize: "vertical" }}
              value={header.remarks}
              onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))}
              placeholder="Remarks"
            />
          </div>
        </div>
      </FormCard>

      <FormCard title="Invoice Allocations" variant="teal-header">
        <div style={{ color: "#667085", fontSize: 13, marginBottom: 16 }}>
          Receipt currency uses the system default: {currencyCode} ({currencyLabel})
        </div>
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ ...tableStyle, minWidth: 1080 }}>
            <thead>
              <tr>
                {["Invoice", "Channel", "Location", "Balance Due", `Allocate (${currencyCode})`, "Remove"].map((label) => (
                  <th key={label} style={headStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => {
                const invoice = selectedInvoice(line);
                return (
                  <tr key={line.id}>
                    <td style={cellStyle}>
                      <select
                        style={inputStyle}
                        value={line.salesInvoiceId}
                        onChange={(event) => applyInvoice(index, event.target.value)}
                      >
                        <option value="">Select ...</option>
                        {customerInvoices.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.invoiceNo} - {option.customerCode ?? ""}{option.customerCode && option.customerName ? " - " : ""}{option.customerName ?? ""}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={cellStyle}>{invoice?.channel ?? "Channel"}</td>
                    <td style={cellStyle}>{invoice ? `${invoice.locationCode} - ${invoice.locationName}` : "Location"}</td>
                    <td style={cellStyle}>{invoice ? formatCurrency(invoice.balanceDue, currencyCode) : "0.00"}</td>
                    <td style={cellStyle}>
                      <input
                        style={inputStyle}
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.amount}
                        onChange={(event) => upsertLine(index, { amount: Number(event.target.value || 0) })}
                      />
                    </td>
                    <td style={cellStyle}>
                      <button type="button" className="erp-remove-row-btn" style={dangerButtonStyle} onClick={() => removeLine(index)} aria-label={index === 0 ? "Clear allocation" : "Remove allocation"}>
                        X
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" style={addButtonStyle} onClick={addLine}>+ Add Invoice</button>
        </div>
        {isEditMode ? (
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            <div style={metricCardStyle}>
              <div style={labelStyle}>Original Allocation</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {allocationComparison.length ? allocationComparison.map((entry) => (
                  <div key={`old-${entry.key}`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#475467", fontSize: 14 }}>{entry.invoiceLabel}</span>
                    <strong>{formatCurrency(entry.oldAmount, currencyCode)}</strong>
                  </div>
                )) : <span style={{ color: "#667085", fontSize: 14 }}>No original allocations</span>}
              </div>
            </div>
            <div style={metricCardStyle}>
              <div style={labelStyle}>New Allocation</div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {allocationComparison.length ? allocationComparison.map((entry) => (
                  <div key={`new-${entry.key}`} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <span style={{ color: "#475467", fontSize: 14 }}>{entry.invoiceLabel}</span>
                    <strong style={{ color: entry.newAmount !== entry.oldAmount ? "#0f766e" : "#101828" }}>
                      {formatCurrency(entry.newAmount, currencyCode)}
                    </strong>
                  </div>
                )) : <span style={{ color: "#667085", fontSize: 14 }}>No revised allocations yet</span>}
              </div>
            </div>
          </div>
        ) : null}
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          <div style={metricCardStyle}>
            <div style={labelStyle}>Allocated</div>
            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800 }}>{formatCurrency(totalAllocated, currencyCode)}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={labelStyle}>Unapplied</div>
            <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800, color: unappliedAmount < 0 ? "#d92d20" : "#175cd3" }}>
              {formatCurrency(unappliedAmount, currencyCode)}
            </div>
          </div>
        </div>
      </FormCard>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <button type="button" style={secondaryButtonStyle} onClick={() => router.push("/sales/receipts")} disabled={isPending}>
          Cancel
        </button>
        <button type="button" style={primaryButtonStyle} onClick={submit} disabled={isPending}>
          {isPending ? (isEditMode ? "Updating..." : "Posting...") : (isEditMode ? "Update Receipt" : "Post Receipt")}
        </button>
      </div>
    </div>
  );
}

export function CustomerStatementPage({
  statement,
  customers,
  selectedCustomerId,
  currencyCode,
}: {
  statement: CustomerStatement | null;
  customers: Customer[];
  selectedCustomerId?: string | null;
  currencyCode: string;
}) {
  return (
    <div style={shellStyle}>
      <PageHeader
        title="Customer Statement"
        subtitle="Customer ledger from posted invoices, receipts, and credit notes."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Customer Statement" },
        ]}
        actions={statement ? (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/sales/reports/customer-statements/print?customerId=${encodeURIComponent(statement.customerId)}`}
              style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" }}
            >
              Print Statement
            </Link>
            <a
              href={`/api/sales/reports/customer-statements/export?customerId=${encodeURIComponent(statement.customerId)}`}
              style={{ ...secondaryButtonStyle, display: "inline-flex", alignItems: "center", textDecoration: "none" }}
            >
              Export CSV
            </a>
          </div>
        ) : undefined}
      />

      <FormCard title="Statement Filter">
        <form method="get" style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Customer</label>
            <select name="customerId" style={inputStyle} defaultValue={selectedCustomerId ?? ""}>
              <option value="">Select ...</option>
              {customers.filter((customer) => customer.isActive).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.customerCode} - {customer.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ ...fieldStyle, justifyContent: "flex-end" }}>
            <label style={{ ...labelStyle, visibility: "hidden" }}>Generate</label>
            <button type="submit" style={primaryButtonStyle}>Generate Statement</button>
          </div>
        </form>
      </FormCard>

      {!statement ? (
        <FormCard title="Statement">
          <EmptyState title="No customer selected" message="Choose a customer to generate the live statement." />
        </FormCard>
      ) : (
        <>
          <div style={metricGridStyle}>
            <div style={metricCardStyle}>
              <div style={labelStyle}>Customer</div>
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 800 }}>{statement.customerCode} - {statement.customerName}</div>
            </div>
            <div style={metricCardStyle}>
              <div style={labelStyle}>Total Invoiced</div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{formatCurrency(statement.totalInvoiced, currencyCode)}</div>
            </div>
            <div style={metricCardStyle}>
              <div style={labelStyle}>Receipts & Credits</div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#027a48" }}>{formatCurrency(statement.totalReceived, currencyCode)}</div>
            </div>
            <div style={metricCardStyle}>
              <div style={labelStyle}>Outstanding</div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{formatCurrency(statement.outstandingBalance, currencyCode)}</div>
            </div>
          </div>

          <FormCard title="Statement Entries">
            {!statement.entries.length ? (
              <EmptyState title="No statement activity" message="This customer has no posted invoices or receipts in the visible scope." />
            ) : (
              <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
                <table style={{ ...tableStyle, minWidth: 1220 }}>
                  <thead>
                    <tr>
                      {["Date", "Type", "Document", "Due", "Channel", "Location", "Debit", "Credit", "Balance", "Status", "Reference"].map((label) => (
                        <th key={label} style={headStyle}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statement.entries.map((entry) => (
                      <tr key={`${entry.entryType}-${entry.documentId}`}>
                        <td style={cellStyle}>{formatDate(entry.entryDate, "short")}</td>
                        <td style={cellStyle}>{entry.entryType}</td>
                        <td style={cellStyle}>
                          <Link
                            href={entry.entryType === "INVOICE"
                              ? `/sales/invoices/${entry.documentId}`
                              : entry.entryType === "CREDIT_NOTE"
                                ? `/sales/credit-notes/${entry.documentId}`
                                : `/sales/receipts/${entry.documentId}`}
                            style={{ color: "#0f766e", fontWeight: 700, textDecoration: "none" }}
                          >
                            {entry.documentNo}
                          </Link>
                        </td>
                        <td style={cellStyle}>{entry.dueDate ? formatDate(entry.dueDate, "short") : "Not set"}</td>
                        <td style={cellStyle}>{entry.channel ?? "Receipt"}</td>
                        <td style={cellStyle}>{entry.locationCode} - {entry.locationName}</td>
                        <td style={cellStyle}>{formatCurrency(entry.debit, currencyCode)}</td>
                        <td style={cellStyle}>{formatCurrency(entry.credit, currencyCode)}</td>
                        <td style={cellStyle}>{formatCurrency(entry.runningBalance, currencyCode)}</td>
                        <td style={cellStyle}><StatusBadge status={toBadgeStatus(entry.status)} /></td>
                        <td style={cellStyle}>{entry.reference ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </FormCard>
        </>
      )}
    </div>
  );
}
