import type {
  ChannelSummaryReportResult,
  DailySalesReportResult,
  ProductSalesReportResult,
} from "@/services/sales/sales-report.service";
import {
  ReportHeader,
  ReportKpiGrid,
  ReportPageShell,
  ReportTable,
} from "@/components/reporting";
import type { Column } from "@/components/shared";

function buildMoney(currencyCode: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
  });
}

function ReportShell({
  title,
  subtitle,
  metrics,
  children,
}: {
  title: string;
  subtitle: string;
  metrics: Array<[string, string | number]>;
  children: React.ReactNode;
}) {
  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title={title}
          subtitle={subtitle}
          breadcrumbs={[
            { label: "Reports", href: "/reports" },
            { label: "Sales" },
          ]}
        />
      }
      kpis={<ReportKpiGrid items={metrics.map(([label, value]) => ({ label, value }))} />}
    >
      <section
        style={{
          padding: "20px 24px",
          borderRadius: "18px",
          border: "1px solid #e4e7ec",
          background: "#ffffff",
        }}
      >
        {children}
      </section>
    </ReportPageShell>
  );
}

export function DailySalesReportPage({
  report,
  currencyCode,
}: {
  report: DailySalesReportResult;
  currencyCode: string;
}) {
  const money = buildMoney(currencyCode);
  const columns: Column<DailySalesReportResult["rows"][number]>[] = [
    { key: "saleDate", label: "Date" },
    { key: "documentCount", label: "Documents" },
    { key: "totalQuantity", label: "Quantity", render: (value) => Number(value ?? 0).toFixed(2) },
    { key: "totalValue", label: "Total Value", render: (value) => money.format(Number(value ?? 0)) },
    { key: "paidValue", label: "Paid Value", render: (value) => money.format(Number(value ?? 0)) },
    { key: "unpaidValue", label: "Unpaid Value", render: (value) => money.format(Number(value ?? 0)) },
  ];

  return (
    <ReportShell
      title="Daily Sales Report"
      subtitle="Daily sales totals using saved sales snapshots, filtered to locations the signed-in user can access."
      metrics={[
        ["Sales Days", report.rows.length],
        ["Total Documents", report.totals.totalDocuments],
        ["Total Quantity", report.totals.totalQuantity.toFixed(2)],
        ["Total Value", money.format(report.totals.totalValue)],
      ]}
    >
      <ReportTable columns={columns} data={report.rows} pageSize={15} />
    </ReportShell>
  );
}

export function ProductSalesReportPage({
  report,
  currencyCode,
}: {
  report: ProductSalesReportResult;
  currencyCode: string;
}) {
  const money = buildMoney(currencyCode);
  const columns: Column<ProductSalesReportResult["rows"][number]>[] = [
    { key: "itemCode", label: "Item Code" },
    { key: "itemName", label: "Item Name" },
    { key: "uom", label: "UOM", render: (value) => String(value ?? "-") },
    { key: "documentCount", label: "Documents" },
    { key: "totalQuantity", label: "Quantity", render: (value) => Number(value ?? 0).toFixed(2) },
    { key: "averageUnitPrice", label: "Average Unit Price", render: (value) => money.format(Number(value ?? 0)) },
    { key: "totalValue", label: "Total Value", render: (value) => money.format(Number(value ?? 0)) },
  ];

  return (
    <ReportShell
      title="Product Sales Report"
      subtitle="Finished goods sold by saved transaction snapshot, scoped to the locations the signed-in user can view."
      metrics={[
        ["Products", report.totals.totalProducts],
        ["Total Quantity", report.totals.totalQuantity.toFixed(2)],
        ["Total Value", money.format(report.totals.totalValue)],
      ]}
    >
      <ReportTable columns={columns} data={report.rows} pageSize={15} />
    </ReportShell>
  );
}

export function ChannelSummaryReportPage({
  report,
  currencyCode,
}: {
  report: ChannelSummaryReportResult;
  currencyCode: string;
}) {
  const money = buildMoney(currencyCode);
  const columns: Column<ChannelSummaryReportResult["rows"][number]>[] = [
    { key: "channel", label: "Channel" },
    { key: "documentCount", label: "Documents" },
    { key: "totalQuantity", label: "Quantity", render: (value) => Number(value ?? 0).toFixed(2) },
    { key: "totalValue", label: "Total Value", render: (value) => money.format(Number(value ?? 0)) },
    { key: "paidCount", label: "Paid" },
    { key: "unpaidCount", label: "Unpaid" },
  ];

  return (
    <ReportShell
      title="Channel Sales Report"
      subtitle="Revenue and quantity by sales channel, always filtered to the locations the signed-in user is allowed to see."
      metrics={[
        ["Channels", report.totals.totalChannels],
        ["Documents", report.totals.totalDocuments],
        ["Total Quantity", report.totals.totalQuantity.toFixed(2)],
        ["Total Value", money.format(report.totals.totalValue)],
      ]}
    >
      <ReportTable columns={columns} data={report.rows} pageSize={15} />
    </ReportShell>
  );
}
