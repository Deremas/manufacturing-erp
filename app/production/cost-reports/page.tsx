import { BatchCostReportPage } from "@/features/production/live-pages";
import { getBatchCostReportRows } from "@/services/production/production-costing.service";

export default async function CostReportsPage() {
  const rows = await getBatchCostReportRows();
  return <BatchCostReportPage rows={rows} />;
}
