import { MaintenanceAssetHistoryPageView } from "@/features/maintenance/WorkflowPages";
import { getAssetById, getMaintenanceTickets, getWorkOrders } from "@/services/maintenance/maintenance.service";
import { listAssetHistory, listAssetQualityHistory } from "@/services/maintenance/asset-lifecycle.service";

export default async function MaintenanceAssetHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [asset, tickets, workOrders, lifecycleHistory, qualityHistory] = await Promise.all([
    getAssetById(id),
    getMaintenanceTickets(),
    getWorkOrders(),
    listAssetHistory(id),
    listAssetQualityHistory(id),
  ]);
  return <MaintenanceAssetHistoryPageView asset={asset} tickets={tickets} workOrders={workOrders} lifecycleHistory={lifecycleHistory} qualityHistory={qualityHistory} />;
}
