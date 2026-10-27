import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";
import Link from "next/link";
import { Eye } from "lucide-react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type { SalesReturnListRow } from "@/services/sales/sales.service";

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 920,
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

export function SalesReturnsListPage({
  items,
  currencyCode,
}: {
  items: SalesReturnListRow[];
  currencyCode: string;
}) {
  const totalValue = items.reduce((sum, item) => sum + item.totalAmount, 0);

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        title="Sales Returns"
        subtitle="Posted sales returns that increased stock back through the inventory posting service"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Returns" },
        ]}
        actions={(
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
            Pick From Sales
          </Link>
        )}
      />

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Total Returns</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#101828" }}>{items.length}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Posted</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#027a48" }}>
            {items.filter((item) => item.status === "POSTED").length}
          </div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Total Value</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#101828" }}>{formatCurrency(totalValue, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="Return Register">
        {!items.length ? (
          <EmptyState
            title="No sales returns yet"
            message="Open a posted sale and create a return when stock needs to come back into inventory."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={headStyle}>Return No</th>
                  <th style={headStyle}>Date</th>
                  <th style={headStyle}>Source Sale</th>
                  <th style={headStyle}>Channel</th>
                  <th style={headStyle}>Location</th>
                  <th style={headStyle}>Customer</th>
                  <th style={headStyle}>Items</th>
                  <th style={headStyle}>Total</th>
                  <th style={headStyle}>Status</th>
                  <th style={headStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}><strong>{item.returnNo}</strong></td>
                    <td style={cellStyle}>{formatDate(item.returnDate, "short")}</td>
                    <td style={cellStyle}>{item.saleNo ?? "Manual"}</td>
                    <td style={cellStyle}>{item.channel}</td>
                    <td style={cellStyle}>{item.locationCode} - {item.locationName}</td>
                    <td style={cellStyle}>
                      {item.customerCode && item.customerName
                        ? `${item.customerCode} - ${item.customerName}`
                        : "Walk-in customer"}
                    </td>
                    <td style={cellStyle}>{item.itemCount}</td>
                    <td style={cellStyle}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={cellStyle}><StatusBadge status={badgeStatus(item.status)} /></td>
                    <td style={cellStyle}>
                      <Link
                        href={publicViewUrl("sales.return", item.publicId)}
                        title="View return"
                        aria-label={`View ${item.returnNo}`}
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
