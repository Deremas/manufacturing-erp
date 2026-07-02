import { CostSettingsListPage } from "@/features/production/live-pages";
import { listOverheadCostSettings } from "@/services/production/overhead-cost.service";

export default async function CostSettingsPage() {
  const rows = await listOverheadCostSettings();
  return <CostSettingsListPage rows={rows} />;
}
