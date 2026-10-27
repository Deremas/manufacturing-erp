import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";
import Link from "next/link";
import { Eye, RotateCcw } from "lucide-react";

import { EmptyState, FormCard, PageHeader, StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { formatCurrency, formatDate } from "@/lib/utils/cn";
import type { SalesListRow } from "@/services/sales/sales.service";

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  minWidth: 920,
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

export function SalesHistoryPage({
  items,
  currencyCode,
  title = "Sales History",
  subtitle = "Posted sales with price snapshot, inventory issue, and finance posting already locked in",
  breadcrumbs = [
    { label: "Sales", href: "/sales" },
    { label: "Sales History" },
  ],
  createHref = "/sales/pos",
  createLabel = "Open POS",
  channelFilter,
  detailBaseHref = "/sales/history",
}: {
  items: SalesListRow[];
  currencyCode: string;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  createHref?: string;
  createLabel?: string;
  channelFilter?: string | null;
  detailBaseHref?: string;
}) {
  const totalSales = items.reduce((sum, row) => sum + row.totalAmount, 0);
  const postedCount = items.filter((row) => row.status === "POSTED").length;
  const factoryCount = items.filter((row) => row.channel === "FACTORY").length;
  const channelCount = channelFilter ? items.filter((row) => row.channel === channelFilter).length : 0;
  const detailSuffix = channelFilter ? `?channel=${encodeURIComponent(channelFilter)}` : "";

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={(
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              href="/sales/returns"
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
              Sales Returns
            </Link>
            <Link
              href={createHref}
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
              {createLabel}
            </Link>
          </div>
        )}
      />

      <div style={metricGridStyle}>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Total Sales</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#101828" }}>{items.length}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Posted</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#027a48" }}>{postedCount}</div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>
            {channelFilter ? `${channelFilter} Sales` : "Factory Sales"}
          </div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#175cd3" }}>
            {channelFilter ? channelCount : factoryCount}
          </div>
        </div>
        <div style={metricCardStyle}>
          <div style={{ fontSize: 13, color: "#667085", fontWeight: 800, textTransform: "uppercase" }}>Revenue</div>
          <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800, color: "#101828" }}>{formatCurrency(totalSales, currencyCode)}</div>
        </div>
      </div>

      <FormCard title="Posted Sales">
        {!items.length ? (
          <EmptyState
            title="No posted sales yet"
            message="POS postings will appear here once sales are saved with price snapshot, inventory issue, and finance posting."
          />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={headStyle}>Sale No</th>
                  <th style={headStyle}>Date</th>
                  <th style={headStyle}>Channel</th>
                  <th style={headStyle}>Location</th>
                  <th style={headStyle}>Customer</th>
                  <th style={headStyle}>Items</th>
                  <th style={headStyle}>Payment</th>
                  <th style={headStyle}>Total</th>
                  <th style={headStyle}>Status</th>
                  <th style={headStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td style={cellStyle}>
                      <div style={{ fontWeight: 800 }}>{item.saleNo}</div>
                    </td>
                    <td style={cellStyle}>{formatDate(item.saleDate, "short")}</td>
                    <td style={cellStyle}>
                      <div>{item.channel}</div>
                      {item.tripLabel ? (
                        <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>
                          Trip: {item.tripLabel}
                        </div>
                      ) : null}
                    </td>
                    <td style={cellStyle}>
                      <div>{item.locationCode} - {item.locationName}</div>
                      {item.routeName ? (
                        <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>
                          Route: {item.routeName}
                        </div>
                      ) : null}
                    </td>
                    <td style={cellStyle}>
                      <div>
                        {item.customerCode && item.customerName
                          ? `${item.customerCode} - ${item.customerName}`
                          : "Walk-in customer"}
                      </div>
                      {item.truckLabel ? (
                        <div style={{ marginTop: 4, fontSize: 13, color: "#667085" }}>
                          Truck: {item.truckLabel}
                        </div>
                      ) : null}
                    </td>
                    <td style={cellStyle}>{item.itemCount}</td>
                    <td style={cellStyle}>{item.paymentMethod ?? "Cash"}</td>
                    <td style={cellStyle}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={cellStyle}><StatusBadge status={badgeStatus(item.status)} /></td>
                    <td style={cellStyle}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <Link
                          href={publicViewUrl("sales.sale", item.publicId)}
                          title="View sale"
                          aria-label={`View ${item.saleNo}`}
                          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #d0d5dd", color: "#344054", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/sales/returns/create?saleId=${item.id}`}
                          title="Create return"
                          aria-label={`Create return for ${item.saleNo}`}
                          style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid #bfd4fe", color: "#175cd3", background: "#eff8ff", display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                        >
                          <RotateCcw size={16} />
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
