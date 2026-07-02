import { SupplierPerformanceReportPage } from "@/features/procurement/report-pages";
import { getSupplierPerformanceReport } from "@/services/procurement/procurement-report.service";

export default async function SupplierPerformancePage() {
  const rows = await getSupplierPerformanceReport();
  return <SupplierPerformanceReportPage rows={rows} />;
}
