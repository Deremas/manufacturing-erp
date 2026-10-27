import { AssetsListPage } from "@/features/maintenance/MaintenancePages";
import { getAssets, getPreventiveMaintenanceDuePlans } from "@/services/maintenance/maintenance.service";

export const dynamic = "force-dynamic";

export default async function MaintenanceAssetsPage() {
  const [assets, duePlans] = await Promise.all([getAssets(), getPreventiveMaintenanceDuePlans()]);
  return <AssetsListPage assets={assets} pmDueCount={duePlans.length} />;
}
