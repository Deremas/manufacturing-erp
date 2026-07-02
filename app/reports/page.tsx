import InventoryReportsPage from "@/features/reports/InventoryReportsPage";
import { listInventoryReportRows } from "@/services/inventory/inventory-insights.service";

export default async function ReportsRoute() {
  const [transfers, adjustments, issues, returns, requisitions] = await Promise.all([
    listInventoryReportRows("transfers"),
    listInventoryReportRows("adjustments"),
    listInventoryReportRows("issues"),
    listInventoryReportRows("returns"),
    listInventoryReportRows("requisitions"),
  ]);

  return (
    <InventoryReportsPage
      transfers={transfers}
      adjustments={adjustments}
      issues={issues}
      returns={returns}
      requisitions={requisitions}
    />
  );
}
