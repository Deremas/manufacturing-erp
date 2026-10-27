"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import Link from "next/link";
import { ArrowLeft, Ban, Eye, Plus, Printer, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { ActionReasonDialog } from "@/features/sales/components/ActionReasonDialog";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type { SalesCreditNoteDetail, SalesCreditNoteSummary } from "@/services/sales/credit-note.service";

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 980,
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

const infoGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const infoTileStyle: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid #e4e7ec",
  background: "#ffffff",
  padding: 16,
};

function badgeStatus(value: string): BadgeVariant {
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
    default:
      return "draft";
  }
}

export function SalesCreditNoteListPage({
  items,
  currencyCode,
}: {
  items: SalesCreditNoteSummary[];
  currencyCode: string;
}) {
  const router = useRouter();
  const [actionError, setActionError] = useState("");
  const [selectedVoidItem, setSelectedVoidItem] = useState<SalesCreditNoteSummary | null>(null);
  const [isVoidPending, startVoidTransition] = useTransition();
  const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        title="Credit Notes"
        subtitle="Commercial credit notes generated from posted sales returns for receivable reversal traceability."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Credit Notes" },
        ]}
        actions={(
          <Link href="/sales/credit-notes/create" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "11px 16px", borderRadius: 12, background: "#0f766e", color: "#fff", textDecoration: "none", fontWeight: 700 }}>
            <Plus size={17} /> Create from Return
          </Link>
        )}
      />

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Credit Notes</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{items.length}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Total Credit</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{formatCurrency(totalAmount, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="Credit Note Register">
        {actionError ? (
          <div style={{ marginBottom: 16, border: "1px solid #fecdca", background: "#fef3f2", color: "#b42318", borderRadius: 14, padding: "12px 14px", fontWeight: 700 }}>
            {actionError}
          </div>
        ) : null}
        {!items.length ? (
          <EmptyState title="No credit notes yet" message="Posted sales returns will create commercial credit notes automatically." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Credit Note", "Date", "Customer", "Channel", "Location", "Return", "Invoice", "Total", "Status", "Actions"].map((label) => (
                    <th key={label} style={headStyle}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}><strong>{item.creditNoteNo}</strong></td>
                    <td style={cellStyle}>{formatDate(item.creditDate, "short")}</td>
                    <td style={cellStyle}>{item.customerCode && item.customerName ? `${item.customerCode} - ${item.customerName}` : "Walk-in customer"}</td>
                    <td style={cellStyle}>{item.channel}</td>
                    <td style={cellStyle}>{item.locationCode} - {item.locationName}</td>
                    <td style={cellStyle}>
                      <Link href={`/sales/returns/${item.salesReturnId}`} style={{ color: "#0f766e", textDecoration: "none", fontWeight: 700 }}>
                        {item.returnNo}
                      </Link>
                    </td>
                    <td style={cellStyle}>{item.salesInvoiceId && item.invoiceNo ? <Link href={`/sales/invoices/${item.salesInvoiceId}`}>{item.invoiceNo}</Link> : "Not linked"}</td>
                    <td style={cellStyle}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={cellStyle}><StatusBadge status={badgeStatus(item.status)} /></td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link
                          href={publicViewUrl("sales.credit-note", item.publicId)}
                          title="View credit note"
                          aria-label={`View ${item.creditNoteNo}`}
                          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #d0d5dd", color: "#344054", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={publicPrintUrl("sales.credit-note", item.publicId)}
                          title="Print credit note"
                          aria-label={`Print ${item.creditNoteNo}`}
                          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #d0d5dd", color: "#344054", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        >
                          <Printer size={16} />
                        </Link>
                        {String(item.status).toUpperCase() === "POSTED" ? (
                          <button
                            type="button"
                            title="Void credit note"
                            aria-label={`Void ${item.creditNoteNo}`}
                            style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #fecdca", color: "#b42318", background: "#fef3f2", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                            onClick={() => {
                              setActionError("");
                              setSelectedVoidItem(item);
                            }}
                          >
                            <Ban size={16} />
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

      <ActionReasonDialog
        open={Boolean(selectedVoidItem)}
        title={selectedVoidItem ? `Void ${selectedVoidItem.creditNoteNo}` : "Void credit note"}
        description="This will void the commercial credit note and record the reason in audit/history."
        confirmLabel="Void Credit Note"
        loadingLabel="Voiding..."
        error={actionError}
        isPending={isVoidPending}
        onClose={() => {
          if (isVoidPending) {
            return;
          }
          setSelectedVoidItem(null);
        }}
        onConfirm={(reason) => {
          if (!selectedVoidItem) {
            return;
          }
          setActionError("");
          startVoidTransition(async () => {
            const response = await fetch(`/api/sales/credit-notes/${selectedVoidItem.id}/void`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason }),
            });
            const payload = await response.json();
            if (!response.ok) {
              setActionError(payload.error ?? "Failed to void credit note");
              return;
            }
            setSelectedVoidItem(null);
            router.refresh();
          });
        }}
      />
    </div>
  );
}

export function SalesCreditNoteDetailPage({
  item,
  currencyCode,
}: {
  item: SalesCreditNoteDetail | null;
  currencyCode: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [showVoidDialog, setShowVoidDialog] = useState(false);

  if (!item) {
    return (
      <div style={{ padding: 24, background: "#f8fafc" }}>
        <PageHeader title="Credit note not found" breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Credit Notes" }]} />
        <FormCard title="Missing Record">
          <EmptyState title="Credit note not found" message="The requested credit note does not exist or is outside your visible scope." />
        </FormCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        recordKind="sales.invoice"
        title={item.creditNoteNo}
        subtitle="Commercial credit note split cleanly from the operational sales return record."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Credit Notes", href: "/sales/credit-notes" },
          { label: item.creditNoteNo },
        ]}
        actions={(
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/sales/credit-notes" style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 700 }}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </Link>
            <Link href={publicPrintUrl("sales.credit-note", item.publicId)} style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 700 }}>
              <Printer size={16} />
              <span>Print</span>
            </Link>
            <Link href={`/sales/returns/${item.salesReturnId}`} style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "none", background: "#0f766e", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none", fontWeight: 700 }}>
              <Undo2 size={16} />
              <span>Open Sales Return</span>
            </Link>
            {String(item.status).toUpperCase() === "POSTED" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setMessage("");
                  setShowVoidDialog(true);
                }}
                style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid #fecdca", background: "#fef3f2", color: "#b42318", display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 700, cursor: "pointer" }}
              >
                <Ban size={16} />
                <span>{isPending ? "Voiding..." : "Void"}</span>
              </button>
            ) : null}
          </div>
        )}
      />

      {message ? (
        <div style={{ border: "1px solid #fecdca", background: "#fef3f2", color: "#b42318", borderRadius: 14, padding: "12px 14px", fontWeight: 700 }}>
          {message}
        </div>
      ) : null}

      <div style={infoGridStyle}>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Customer</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>{item.customerCode && item.customerName ? `${item.customerCode} - ${item.customerName}` : "Walk-in customer"}</div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Status</div>
          <div style={{ marginTop: 8 }}><StatusBadge status={badgeStatus(item.status)} /></div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Total</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800 }}>{formatCurrency(item.totalAmount, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="Credit Note Summary">
        <div style={infoGridStyle}>
          <div><div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Credit Date</div><div style={{ marginTop: 8, fontWeight: 700 }}>{formatDate(item.creditDate, "short")}</div></div>
          <div><div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Channel</div><div style={{ marginTop: 8, fontWeight: 700 }}>{item.channel}</div></div>
          <div><div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Location</div><div style={{ marginTop: 8, fontWeight: 700 }}>{item.locationCode} - {item.locationName}</div></div>
          <div><div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Sales Invoice</div><div style={{ marginTop: 8, fontWeight: 700 }}>{item.invoiceNo ?? "Not linked"}</div></div>
          <div><div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Reason</div><div style={{ marginTop: 8, fontWeight: 700 }}>{item.reason ?? "Sales return credit"}</div></div>
        </div>
        {item.remarks ? <div style={{ marginTop: 18, fontSize: 14, color: "#475467" }}>{item.remarks}</div> : null}
      </FormCard>

      <FormCard title="Credit Note Lines">
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {["Item", "UOM", "Qty", "Unit Price", "Line Total", "Reason"].map((label) => (
                  <th key={label} style={headStyle}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.items.map((line) => (
                <tr key={line.id}>
                  <td style={cellStyle}>{line.itemCode} - {line.itemName}</td>
                  <td style={cellStyle}>{line.uomCode && line.uomName ? `${line.uomCode} - ${line.uomName}` : line.uomName ?? line.uomCode ?? "UOM"}</td>
                  <td style={cellStyle}>{line.quantity.toFixed(2)}</td>
                  <td style={cellStyle}>{formatCurrency(line.unitPrice, currencyCode)}</td>
                  <td style={cellStyle}>{formatCurrency(line.lineTotal, currencyCode)}</td>
                  <td style={cellStyle}>{line.reason ?? "Sales return credit"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <ActionReasonDialog
        open={showVoidDialog}
        title={`Void ${item.creditNoteNo}`}
        description="This will void the credit note and reverse its commercial posting references."
        confirmLabel="Void Credit Note"
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
            const response = await fetch(`/api/sales/credit-notes/${item.id}/void`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason }),
            });
            const payload = await response.json();
            if (!response.ok) {
              setMessage(payload.error ?? "Failed to void credit note");
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
