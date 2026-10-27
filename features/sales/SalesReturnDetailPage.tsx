import Link from "next/link";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type { SalesReturnDetail } from "@/services/sales/sales.service";

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

export function SalesReturnDetailPage({
  salesReturn,
  currencyCode,
}: {
  salesReturn: SalesReturnDetail | null;
  currencyCode: string;
}) {
  if (!salesReturn) {
    return (
      <div style={{ padding: 24, background: "#f8fafc" }}>
        <PageHeader title="Sales return not found" breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Sales Returns" }]} />
        <FormCard title="Missing Record">
          <EmptyState title="Sales return not found" message="The requested return does not exist or is archived." />
        </FormCard>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        recordKind="sales.return"
        title={salesReturn.returnNo}
        subtitle="Posted return snapshot with stock received back into inventory"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Returns", href: "/sales/returns" },
          { label: salesReturn.returnNo },
        ]}
        actions={(
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/sales/returns" style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid #d0d5dd", background: "#ffffff", color: "#344054", display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 700 }}>
              Back
            </Link>
            {salesReturn.creditNoteId ? (
              <Link href={`/sales/credit-notes/${salesReturn.creditNoteId}`} style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "1px solid #175cd3", background: "#eff8ff", color: "#175cd3", display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 700 }}>
                Open Credit Note
              </Link>
            ) : null}
            {salesReturn.saleId ? (
              <Link href={`/sales/history/${salesReturn.saleId}`} style={{ height: 40, padding: "0 16px", borderRadius: 12, border: "none", background: "#0f766e", color: "#ffffff", display: "inline-flex", alignItems: "center", textDecoration: "none", fontWeight: 700 }}>
                Open Source Sale
              </Link>
            ) : null}
          </div>
        )}
      />

      <div style={infoGridStyle}>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Source Sale</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>{salesReturn.saleNo ?? "Manual Return"}</div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Channel</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>{salesReturn.channel}</div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Return Location</div>
          <div style={{ marginTop: 8, fontSize: 18, fontWeight: 800, color: "#101828" }}>{salesReturn.locationCode} - {salesReturn.locationName}</div>
        </div>
        <div style={infoTileStyle}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#667085", textTransform: "uppercase" }}>Status</div>
          <div style={{ marginTop: 8 }}><StatusBadge status={badgeStatus(salesReturn.status)} /></div>
        </div>
      </div>

      <FormCard title="Return Summary">
        <div style={infoGridStyle}>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Return Date</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{formatDate(salesReturn.returnDate, "short")}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Customer</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>
              {salesReturn.customerCode && salesReturn.customerName
                ? `${salesReturn.customerCode} - ${salesReturn.customerName}`
                : "Walk-in customer"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Reason</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{salesReturn.reason ?? "Not specified"}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Total Amount</div>
            <div style={{ marginTop: 8, fontSize: 18, color: "#101828", fontWeight: 800 }}>{formatCurrency(salesReturn.totalAmount, currencyCode)}</div>
          </div>
          <div>
            <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Credit Note</div>
            <div style={{ marginTop: 8, fontSize: 16, color: "#101828", fontWeight: 700 }}>{salesReturn.creditNoteNo ?? "Not generated"}</div>
          </div>
        </div>
        {salesReturn.remarks ? (
          <div style={{ marginTop: 18, fontSize: 14, color: "#475467" }}>{salesReturn.remarks}</div>
        ) : null}
      </FormCard>

      <FormCard title="Returned Lines">
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={headStyle}>Item</th>
                <th style={headStyle}>UOM</th>
                <th style={headStyle}>Qty</th>
                <th style={headStyle}>Unit Price</th>
                <th style={headStyle}>Line Total</th>
                <th style={headStyle}>Reason</th>
              </tr>
            </thead>
            <tbody>
              {salesReturn.items.map((item) => (
                <tr key={item.id}>
                  <td style={cellStyle}>{item.itemCode} - {item.itemName}</td>
                  <td style={cellStyle}>{item.uomCode && item.uomName ? `${item.uomCode} - ${item.uomName}` : item.uomName ?? item.uomCode ?? "UOM"}</td>
                  <td style={cellStyle}>{item.quantity.toFixed(2)}</td>
                  <td style={cellStyle}>{formatCurrency(item.unitPrice, currencyCode)}</td>
                  <td style={cellStyle}>{formatCurrency(item.lineTotal, currencyCode)}</td>
                  <td style={cellStyle}>{item.reason ?? "Return to stock"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>
    </div>
  );
}
