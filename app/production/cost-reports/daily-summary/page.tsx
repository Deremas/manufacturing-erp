import { DailyCostSummaryPage } from "@/features/production/live-pages";
import { getDailyProductionCostSummary } from "@/services/production/production-costing.service";

export default async function DailySummaryPage() {
  const rows = await getDailyProductionCostSummary();
  return <DailyCostSummaryPage rows={rows} />;
}
