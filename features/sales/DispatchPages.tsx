"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Eye, FileText, Printer } from "lucide-react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { formatCurrency } from "@/lib/utils/cn";
import type {
  SalesDispatchDetail,
  SalesDispatchSummary,
} from "@/services/sales/sales-dispatch.service";

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: 24,
  background: "#f8fafc",
};

const metricGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const metricCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  padding: "18px 20px",
  border: "1px solid #e4e7ec",
  boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
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
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

function toBadgeStatus(status: string) {
  switch (String(status).trim().toUpperCase()) {
    case "POSTED":
    case "CONFIRMED":
    case "ISSUED":
      return "posted" as const;
    case "CANCELLED":
      return "voided" as const;
    default:
      return "draft" as const;
  }
}

const actionIconLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: "1px solid #d0d5dd",
  background: "#ffffff",
  color: colors.text.primary,
  textDecoration: "none",
};

export function SalesDispatchListPage({
  items,
  currencyCode,
}: {
  items: SalesDispatchSummary[];
  currencyCode: string;
}) {
  const router = useRouter();
  const metrics = {
    total: items.length,
    posted: items.filter((item) => item.status === "POSTED").length,
    truck: items.filter((item) => item.channel === "TRUCK").length,
    totalAmount: items.reduce((sum, item) => sum + Number(item.totalAmount ?? 0), 0),
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        title="Dispatch Register"
        subtitle="Review posted delivery documents created from reserve-only loading confirmations."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Dispatch" },
        ]}
        actions={(
          <button
            type="button"
            style={{
              height: 48,
              padding: "0 18px",
              borderRadius: 14,
              border: "1px solid #d0d5dd",
              background: "#ffffff",
              color: colors.text.primary,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
            }}
            onClick={() => router.push("/sales/loading")}
          >
            Open Loading Orders
          </button>
        )}
      />

      <div style={metricGridStyle}>
        {[
          { label: "Total Dispatches", value: metrics.total },
          { label: "Posted", value: metrics.posted },
          { label: "Truck Dispatches", value: metrics.truck },
          { label: `Total Value (${currencyCode})`, value: formatCurrency(metrics.totalAmount, currencyCode) },
        ].map((metric) => (
          <div key={metric.label} style={metricCardStyle}>
            <div style={{ ...labelStyle, textTransform: "uppercase", letterSpacing: "0.04em" }}>{metric.label}</div>
            <div style={{ marginTop: 10, fontSize: typeof metric.value === "string" ? 20 : 28, fontWeight: 800, color: colors.text.primary }}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      <FormCard title="Dispatch Register" variant="teal-header">
        {items.length === 0 ? (
          <EmptyState
            title="No dispatches yet"
            message="Dispatch documents will appear here once posted loading orders are confirmed into delivered sales."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 1220, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  {["Dispatch No", "Date", "Channel", "From Location", "Counterparty / Truck", "Trip", "Loading", "Sale", "Invoice", "Items", "Qty", "Amount", "Status", "Actions"].map((label) => (
                    <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #eaecf0" }}>
                    <td style={{ padding: "14px 10px", fontWeight: 700 }}>{item.dispatchNo}</td>
                    <td style={{ padding: "14px 10px" }}>{item.dispatchDate.slice(0, 10)}</td>
                    <td style={{ padding: "14px 10px" }}>{item.channel}</td>
                    <td style={{ padding: "14px 10px" }}>{item.locationCode} - {item.locationName}</td>
                    <td style={{ padding: "14px 10px" }}>{item.customerName ?? item.agentName ?? item.truckLabel ?? "Not assigned"}</td>
                    <td style={{ padding: "14px 10px" }}>{item.tripLabel ?? item.routeName ?? "Not assigned"}</td>
                    <td style={{ padding: "14px 10px" }}>
                      <Link href={`/sales/loading/${item.loadingOrderId}`}>{item.loadingNo}</Link>
                    </td>
                    <td style={{ padding: "14px 10px" }}>
                      {item.saleId && item.saleNo ? <Link href={`/sales/history?channel=${encodeURIComponent(item.channel)}`}>{item.saleNo}</Link> : "Not linked"}
                    </td>
                    <td style={{ padding: "14px 10px" }}>{item.invoiceId && item.invoiceNo ? <Link href={`/sales/invoices/${item.invoiceId}`}>{item.invoiceNo}</Link> : "Not invoiced"}</td>
                    <td style={{ padding: "14px 10px" }}>{item.itemCount}</td>
                    <td style={{ padding: "14px 10px" }}>{item.totalQuantity}</td>
                    <td style={{ padding: "14px 10px" }}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={{ padding: "14px 10px" }}><StatusBadge status={toBadgeStatus(item.status)} /></td>
                    <td style={{ padding: "14px 10px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <Link href={publicViewUrl("sales.dispatch", item.publicId)} style={actionIconLinkStyle} title="View dispatch" aria-label="View dispatch">
                          <Eye size={16} />
                        </Link>
                        {item.invoiceId && item.invoiceNo ? (
                          <Link href={`/sales/invoices/${item.invoiceId}`} style={actionIconLinkStyle} title="Open invoice" aria-label="Open invoice">
                            <FileText size={16} />
                          </Link>
                        ) : null}
                        <Link href={publicPrintUrl("sales.dispatch", item.publicId)} style={actionIconLinkStyle} title="Print dispatch" aria-label="Print dispatch">
                          <Printer size={16} />
                        </Link>
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

export function SalesDispatchDetailPage({
  item,
  currencyCode,
}: {
  item: SalesDispatchDetail;
  currencyCode: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const createInvoice = () => {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/sales/dispatch/${item.id}/convert-invoice`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload?.error ?? "Failed to create invoice");
        return;
      }
      router.push(publicViewUrl("sales.invoice", payload.item.publicId));
    });
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="sales.sale"
        title={item.dispatchNo}
        subtitle="Trace the physical dispatch, saved sales snapshot, and source loading document from one live delivery record."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Dispatch", href: "/sales/dispatch" },
          { label: item.dispatchNo },
        ]}
        actions={(
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              style={{
                height: 48,
                padding: "0 18px",
                borderRadius: 14,
                border: "1px solid #d0d5dd",
                background: "#ffffff",
                color: colors.text.primary,
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => router.push("/sales/dispatch")}
            >
              Back
            </button>
            <button
              type="button"
              style={{
                height: 48,
                padding: "0 18px",
                borderRadius: 14,
                border: "none",
                background: colors.primary[700],
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
              onClick={() => router.push(publicPrintUrl("sales.dispatch", item.publicId))}
            >
              Print Dispatch
            </button>
            {item.invoiceId ? (
              <button
                type="button"
                style={{
                  height: 48,
                  padding: "0 18px",
                  borderRadius: 14,
                  border: "none",
                  background: "#0f766e",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/sales/invoices/${item.invoiceId}`)}
              >
                Open Invoice
              </button>
            ) : (
              <button
                type="button"
                style={{
                  height: 48,
                  padding: "0 18px",
                  borderRadius: 14,
                  border: "none",
                  background: "#0f766e",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isPending ? "wait" : "pointer",
                  opacity: isPending ? 0.7 : 1,
                }}
                onClick={createInvoice}
                disabled={isPending}
              >
                {isPending ? "Creating..." : "Create Invoice"}
              </button>
            )}
          </div>
        )}
      />

      {message ? <div style={{ color: "#b42318", fontWeight: 700 }}>{message}</div> : null}

      <FormCard title="Dispatch Summary" variant="teal-header">
        <div style={fieldGridStyle}>
          {[
            ["Status", item.status],
            ["Dispatch Date", item.dispatchDate.slice(0, 19).replace("T", " ")],
            ["Channel", item.channel],
            ["From Location", `${item.locationCode} - ${item.locationName}`],
            ["Destination", item.destinationLocationCode ? `${item.destinationLocationCode} - ${item.destinationLocationName}` : "Not assigned"],
            ["Loading Order", item.loadingNo],
            ["Sale", item.saleNo ?? "Not linked"],
            ["Invoice", item.invoiceNo ?? "Not invoiced"],
            ["Trip", item.tripLabel ?? "Not assigned"],
            ["Truck", item.truckLabel ?? item.truckId ?? "Not assigned"],
            ["Driver", item.driverName ?? item.driverId ?? "Not assigned"],
            ["Customer", item.customerName ?? "Not assigned"],
            ["Agent", item.agentName ?? "Not assigned"],
            ["Route", item.routeName ?? "Not assigned"],
            ["Posted At", item.postedAt ? item.postedAt.slice(0, 19).replace("T", " ") : "Not posted"],
          ].map(([label, value]) => (
            <div key={String(label)} style={fieldStyle}>
              <span style={labelStyle}>{label}</span>
              <div style={{ color: colors.text.primary, fontWeight: 600 }}>{value}</div>
            </div>
          ))}
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <span style={labelStyle}>Remarks</span>
            <div style={{ color: colors.text.primary }}>{item.remarks || "No remarks"}</div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Dispatch Items" variant="teal-header">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1180, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                {["Item", "UOM", "Qty", "Unit Price", "Line Total", "Price List", "Movement"].map((label) => (
                  <th key={label} style={{ padding: "12px 10px", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {item.items.map((line) => (
                <tr key={line.id} style={{ borderTop: "1px solid #eaecf0" }}>
                  <td style={{ padding: "14px 10px" }}>{line.itemCode} - {line.itemName}</td>
                  <td style={{ padding: "14px 10px" }}>{line.uomCode && line.uomName ? `${line.uomCode} - ${line.uomName}` : line.uomName ?? line.uomCode ?? "UOM"}</td>
                  <td style={{ padding: "14px 10px" }}>{line.quantity}</td>
                  <td style={{ padding: "14px 10px" }}>{formatCurrency(line.unitPrice, currencyCode)}</td>
                  <td style={{ padding: "14px 10px" }}>{formatCurrency(line.lineTotal, currencyCode)}</td>
                  <td style={{ padding: "14px 10px" }}>{line.priceListCode ?? "Saved snapshot"}</td>
                  <td style={{ padding: "14px 10px" }}>{line.inventoryMovementId ?? "Posted with sale"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 16, display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ color: colors.text.secondary }}>Dispatch is created from confirmed loading quantities and keeps the same price snapshot used for the posted sale.</div>
          <div style={{ fontWeight: 800, color: colors.text.primary }}>
            Total Dispatch Value: {formatCurrency(item.totalAmount, currencyCode)}
          </div>
        </div>
      </FormCard>
    </div>
  );
}
