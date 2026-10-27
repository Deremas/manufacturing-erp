import InventoryReportsPage from "@/features/reports/InventoryReportsPage";
import { requireAuth } from "@/lib/auth/auth";
import { listInventoryReportRows } from "@/services/inventory/inventory-insights.service";
import { getAccessibleReportGroups } from "@/services/reports/report-access.service";

export const dynamic = "force-dynamic";

export default async function ReportsRoute() {
  const user = await requireAuth();
  const [transfers, adjustments, issues, returns, requisitions] = await Promise.all([
    listInventoryReportRows("transfers"),
    listInventoryReportRows("adjustments"),
    listInventoryReportRows("issues"),
    listInventoryReportRows("returns"),
    listInventoryReportRows("requisitions"),
  ]);

  return (
    <InventoryReportsPage
      groups={getAccessibleReportGroups(user)}
      transfers={transfers}
      adjustments={adjustments}
      issues={issues}
      returns={returns}
      requisitions={requisitions}
      refreshedAt={new Date().toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    />
  );
}
