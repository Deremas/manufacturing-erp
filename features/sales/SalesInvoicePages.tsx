"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import Link from "next/link";
import { Eye } from "lucide-react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type { SalesInvoiceDetail, SalesInvoiceSummary } from "@/services/sales/sales-invoice.service";

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

function badgeStatus(value: string): BadgeVariant {
  const normalized = value.trim().toLowerCase();
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
    case "unpaid":
      return "draft";
    case "partial":
      return "pending";
    default:
      return "draft";
  }
}

export function SalesInvoiceListPage({
  items,
  currencyCode,
  channelFilter,
}: {
  items: SalesInvoiceSummary[];
  currencyCode: string;
  channelFilter?: string | null;
}) {
  const totalInvoices = items.length;
  const postedCount = items.filter((row) => row.status === "POSTED").length;
  const channelCount = channelFilter ? items.filter((row) => row.channel === channelFilter).length : items.length;
  const totalAmount = items.reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);
  const totalBalance = items.reduce((sum, row) => sum + Number(row.balanceDue ?? 0), 0);
  const detailSuffix = channelFilter ? `?channel=${encodeURIComponent(channelFilter)}` : "";

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        title="Sales Invoices"
        subtitle="Commercial invoice documents created from posted sales or dispatch confirmations."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Invoices" },
        ]}
        actions={(
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/sales/history"
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid #d0d5dd",
                background: "#ffffff",
                color: "#344054",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Open Posted Sales
            </Link>
          </div>
        )}
      />

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Total Invoices</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#101828" }}>{totalInvoices}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Posted</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#027a48" }}>{postedCount}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>
            {channelFilter ? `${channelFilter} Invoices` : "Visible Invoices"}
          </div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{channelCount}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Invoice Value</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#101828" }}>{formatCurrency(totalAmount, currencyCode)}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Outstanding AR</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>{formatCurrency(totalBalance, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="Invoice Register">
        {!items.length ? (
          <EmptyState
            title="No sales invoices yet"
            message="Invoice documents will appear here once posted sales or dispatches are converted into commercial invoices."
          />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={headStyle}>Invoice No</th>
                  <th style={headStyle}>Date</th>
                  <th style={headStyle}>Channel</th>
                  <th style={headStyle}>Location</th>
                  <th style={headStyle}>Customer</th>
                  <th style={headStyle}>Dispatch</th>
                  <th style={headStyle}>Sale</th>
                  <th style={headStyle}>Items</th>
                  <th style={headStyle}>Paid</th>
                  <th style={headStyle}>Balance</th>
                  <th style={headStyle}>Payment</th>
                  <th style={headStyle}>Total</th>
                  <th style={headStyle}>Status</th>
                  <th style={headStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}><div style={{ fontWeight: 800 }}>{item.invoiceNo}</div></td>
                    <td style={cellStyle}>{formatDate(item.invoiceDate, "short")}</td>
                    <td style={cellStyle}>{item.channel}</td>
                    <td style={cellStyle}>{item.locationCode} - {item.locationName}</td>
                    <td style={cellStyle}>{item.customerCode && item.customerName ? `${item.customerCode} - ${item.customerName}` : "Walk-in customer"}</td>
                    <td style={cellStyle}>{item.dispatchId && item.dispatchNo ? <Link href={`/sales/dispatch/${item.dispatchId}`}>{item.dispatchNo}</Link> : "Not linked"}</td>
                    <td style={cellStyle}>{item.saleNo}</td>
                    <td style={cellStyle}>{item.itemCount}</td>
                    <td style={cellStyle}>{formatCurrency(item.amountPaid, currencyCode)}</td>
                    <td style={cellStyle}>{formatCurrency(item.balanceDue, currencyCode)}</td>
                    <td style={cellStyle}>{item.paymentStatus}</td>
                    <td style={cellStyle}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={cellStyle}><StatusBadge status={badgeStatus(item.status)} /></td>
                    <td style={cellStyle}>
                      <Link
                        href={publicViewUrl("sales.invoice", item.publicId)}
                        title="View invoice"
                        aria-label={`View ${item.invoiceNo}`}
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

export function SalesInvoiceDetailPage({
  invoice,
  currencyCode,
  backHref = "/sales/invoices",
}: {
  invoice: SalesInvoiceDetail | null;
  currencyCode: string;
  backHref?: string;
}) {
  if (!invoice) {
    return (
      <div style={{ padding: 24, background: "#f8fafc" }}>
        <PageHeader title="Invoice not found" breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Sales Invoices", href: "/sales/invoices" }, { label: "Invoice Detail" }]} />
        <FormCard title="Missing Record">
          <EmptyState title="Invoice not found" message="The requested sales invoice does not exist or is archived." />
        </FormCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        recordKind="sales.invoice"
        title={invoice.invoiceNo}
        subtitle="Commercial invoice document split cleanly from the operational posted-sale record."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Invoices", href: "/sales/invoices" },
          { label: invoice.invoiceNo },
        ]}
        actions={(
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href={backHref}
              style={{
                height: 40,
                padding: "0 16px",
                borderRadius: 12,
                border: "1px solid #d0d5dd",
                background: "#ffffff",
                color: "#344054",
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Back
            </Link>
            {invoice.saleId ? (
              <Link
                href={`/sales/history/${invoice.saleId}`}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "1px solid #175cd3",
                  background: "#eff8ff",
                  color: "#175cd3",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Open Posted Sale
              </Link>
            ) : null}
            {invoice.dispatchId ? (
              <Link
                href={`/sales/dispatch/${invoice.dispatchId}`}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "#0f766e",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Open Dispatch
              </Link>
            ) : null}
            {invoice.balanceDue > 0 ? (
              <Link
                href={`/sales/receipts/create?invoiceId=${encodeURIComponent(invoice.id)}`}
                style={{
                  height: 40,
                  padding: "0 16px",
                  borderRadius: 12,
                  border: "none",
                  background: "#175cd3",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Create Receipt
              </Link>
            ) : null}
          </div>
        )}
      />

      <div style={infoGridStyle}>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Customer</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>
            {invoice.customerCode && invoice.customerName
              ? `${invoice.customerCode} - ${invoice.customerName}`
              : "Walk-in customer"}
          </div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Channel</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>{invoice.channel}</div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Location</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>
            {invoice.locationCode} - {invoice.locationName}
          </div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Status</div>
          <div style={{ marginTop: 8 }}><StatusBadge status={badgeStatus(invoice.status)} /></div>
        </div>
      </div>

      <FormCard title="Invoice Summary">
        <div style={infoGridStyle}>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Invoice Date</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{formatDate(invoice.invoiceDate, "short")}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Due Date</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{invoice.dueDate ? formatDate(invoice.dueDate, "short") : "Not set"}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Dispatch</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{invoice.dispatchNo ?? "Not linked"}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Posted Sale</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{invoice.saleNo}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Payment Status</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{invoice.paymentStatus}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Invoice Total</div>
            <div style={{ marginTop: 8, fontSize: 18, color: "#101828", fontWeight: 800 }}>{formatCurrency(invoice.totalAmount, currencyCode)}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Amount Paid</div>
            <div style={{ marginTop: 8, fontSize: 18, color: "#027a48", fontWeight: 800 }}>{formatCurrency(invoice.amountPaid, currencyCode)}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Balance Due</div>
            <div style={{ marginTop: 8, fontSize: 18, color: "#175cd3", fontWeight: 800 }}>{formatCurrency(invoice.balanceDue, currencyCode)}</div>
          </div>
        </div>
        {invoice.remarks ? (
          <div style={{ marginTop: 18, fontSize: 14, color: "#475467" }}>{invoice.remarks}</div>
        ) : null}
      </FormCard>

      <FormCard title="Invoice Lines">
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headStyle}>Item</th>
                <th style={headStyle}>UOM</th>
                <th style={headStyle}>Qty</th>
                <th style={headStyle}>Unit Price</th>
                <th style={headStyle}>Line Total</th>
                <th style={headStyle}>Dispatch</th>
                <th style={headStyle}>Price Snapshot</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td style={cellStyle}>{item.itemCode} - {item.itemName}</td>
                  <td style={cellStyle}>{item.uomCode && item.uomName ? `${item.uomCode} - ${item.uomName}` : item.uomName ?? item.uomCode ?? "UOM"}</td>
                  <td style={cellStyle}>{item.quantity.toFixed(2)}</td>
                  <td style={cellStyle}>{formatCurrency(item.unitPrice, currencyCode)}</td>
                  <td style={cellStyle}>{formatCurrency(item.lineTotal, currencyCode)}</td>
                  <td style={cellStyle}>{item.dispatchItemId ?? "Mapped through sale snapshot"}</td>
                  <td style={cellStyle}>
                    <div>{item.priceListId ?? "Saved"}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>{item.priceListItemId ?? "Snapshot"}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <FormCard title="Payment Snapshot">
        {!invoice.payments.length ? (
          <EmptyState title="No payment rows" message="This invoice has no linked payment snapshot rows yet." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={headStyle}>Date</th>
                  <th style={headStyle}>Method</th>
                  <th style={headStyle}>Reference</th>
                  <th style={headStyle}>Amount</th>
                  <th style={headStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((payment) => (
                  <tr key={payment.id}>
                    <td style={cellStyle}>{formatDate(payment.paymentDate, "short")}</td>
                    <td style={cellStyle}>{payment.paymentMethod}</td>
                    <td style={cellStyle}>{payment.referenceNo ?? "Direct receipt"}</td>
                    <td style={cellStyle}>{formatCurrency(payment.amount, currencyCode)}</td>
                    <td style={cellStyle}><StatusBadge status={badgeStatus(payment.status)} /></td>
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
