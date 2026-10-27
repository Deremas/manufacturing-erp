import { notFound } from "next/navigation";

import { AssetDetailPage } from "@/features/maintenance/MaintenancePages";
import { getAssetPageAccess } from "@/app/maintenance/_lib/asset-access";
import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { getAssetById, getMaintenanceTickets, getPreventiveMaintenancePlans, getWorkOrders } from "@/services/maintenance/maintenance.service";
import { listAssetAssignments, listAssetHistory, listAssetMeterReadings, listAssetSpareParts } from "@/services/maintenance/asset-lifecycle.service";
import { getMaintenanceAssetCostReport } from "@/services/reports/maintenance-report.service";

export default async function MaintenanceAssetViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const asset = await getAssetById(publicId);
  if (!asset) notFound();
  const id = asset.id;

  const [{ canViewCost, canRetire, canDispose }, tickets, workOrders, assignments, meterReadings, history, pmPlans, spareParts, costRows, referenceData] = await Promise.all([
    getAssetPageAccess(),
    getMaintenanceTickets(),
    getWorkOrders(),
    listAssetAssignments(id),
    listAssetMeterReadings(id),
    listAssetHistory(id),
    getPreventiveMaintenancePlans(),
    listAssetSpareParts(id),
    getMaintenanceAssetCostReport({}, { assetId: id }),
    getMaintenanceReferenceData(),
  ]);

  return (
    <AssetDetailPage
      asset={asset}
      canViewCost={canViewCost}
      canRetire={canRetire}
      canDispose={canDispose}
      tickets={tickets.filter((ticket) => ticket.assetId === id)}
      workOrders={workOrders.filter((order) => order.assetId === id)}
      assignments={assignments}
      meterReadings={meterReadings}
      history={history}
      pmPlans={pmPlans.filter((plan) => plan.assetId === id)}
      spareParts={spareParts}
      items={referenceData.items.map((item) => ({ id: item.id, itemCode: item.itemCode, itemName: item.itemName }))}
      cost={costRows[0] ?? null}
    />
  );
}
