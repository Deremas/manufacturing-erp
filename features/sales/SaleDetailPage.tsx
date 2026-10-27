import Link from "next/link";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type { SaleDetail } from "@/services/sales/sales.service";

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 860,
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
    case "low-stock":
    case "out-of-stock":
      return normalized;
    default:
      return "draft";
  }
}

export function SaleDetailPage({
  sale,
  currencyCode,
  backHref = "/sales/history",
  backLabel = "Back",
  reopenHref = "/sales/pos",
  reopenLabel = "Open POS",
}: {
  sale: SaleDetail | null;
  currencyCode: string;
  backHref?: string;
  backLabel?: string;
  reopenHref?: string;
  reopenLabel?: string;
}) {
  if (!sale) {
    return (
      <div style={{ padding: 24, background: "#f8fafc" }}>
        <PageHeader title="Sale not found" breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Sale Detail" }]} />
        <FormCard title="Missing Record">
          <EmptyState title="Sale not found" message="The requested sale does not exist or is archived." />
        </FormCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        recordKind="sales.sale"
        title={sale.saleNo}
        subtitle="Posted sale snapshot with inventory and finance traceability"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales History", href: "/sales/history" },
          { label: sale.saleNo },
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
              {backLabel}
            </Link>
            <Link
              href={`/sales/returns/create?saleId=${sale.id}`}
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
              Create Return
            </Link>
            <Link
              href={reopenHref}
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
              {reopenLabel}
            </Link>
          </div>
        )}
      />

      <div style={infoGridStyle}>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Customer</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>
            {sale.customerCode && sale.customerName
              ? `${sale.customerCode} - ${sale.customerName}`
              : "Walk-in customer"}
          </div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Channel</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>{sale.channel}</div>
        </div>
        {sale.truckLabel ? (
          <div style={infoTileStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Truck</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>{sale.truckLabel}</div>
          </div>
        ) : null}
        {sale.tripLabel ? (
          <div style={infoTileStyle}>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Trip</div>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>{sale.tripLabel}</div>
          </div>
        ) : null}
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Location</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>
            {sale.locationCode} - {sale.locationName}
          </div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Status</div>
          <div style={{ marginTop: 8 }}><StatusBadge status={badgeStatus(sale.status)} /></div>
        </div>
      </div>

      <FormCard title="Sale Summary">
        <div style={infoGridStyle}>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Sale Date</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{formatDate(sale.saleDate, "short")}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Payment Method</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{sale.paymentMethod ?? "Cash"}</div>
          </div>
          {sale.routeName ? (
            <div>
              <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Route</div>
              <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{sale.routeName}</div>
            </div>
          ) : null}
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Payment Status</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{sale.paymentStatus}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Total Amount</div>
            <div style={{ marginTop: 8, fontSize: 18, color: "#101828", fontWeight: 800 }}>{formatCurrency(sale.totalAmount, currencyCode)}</div>
          </div>
        </div>
        {sale.notes ? (
          <div style={{ marginTop: 18, fontSize: 14, color: "#475467" }}>{sale.notes}</div>
        ) : null}
      </FormCard>

      <FormCard title="Line Snapshot">
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headStyle}>Item</th>
                <th style={headStyle}>UOM</th>
                <th style={headStyle}>Qty</th>
                <th style={headStyle}>Unit Price</th>
                <th style={headStyle}>Line Total</th>
                <th style={headStyle}>Price Snapshot</th>
                <th style={headStyle}>Movement</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id}>
                  <td style={cellStyle}>{item.itemCode} - {item.itemName}</td>
                  <td style={cellStyle}>{item.uomCode && item.uomName ? `${item.uomCode} - ${item.uomName}` : item.uomName ?? item.uomCode ?? "UOM"}</td>
                  <td style={cellStyle}>{item.quantity.toFixed(2)}</td>
                  <td style={cellStyle}>{formatCurrency(item.unitPrice, currencyCode)}</td>
                  <td style={cellStyle}>{formatCurrency(item.lineTotal, currencyCode)}</td>
                  <td style={cellStyle}>
                    <div>{item.priceListId}</div>
                    <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>{item.priceListItemId}</div>
                  </td>
                  <td style={cellStyle}>{item.inventoryMovementId ?? "Posted"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <FormCard title="Payment Snapshot">
        {!sale.payments.length ? (
          <EmptyState title="No payment rows" message="This sale has no recorded payment snapshot rows." />
        ) : (
          <div style={{ overflowX: "auto" }}>
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
                {sale.payments.map((payment) => (
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
