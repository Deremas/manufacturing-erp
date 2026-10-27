import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { WorkOrderFormPage } from "@/features/maintenance/WorkOrderPages";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function EditMaintenanceWorkOrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [referenceData, workOrder] = await Promise.all([
    getMaintenanceReferenceData(),
    getWorkOrderById(publicId),
  ]);

  return (
    <WorkOrderFormPage
      mode="edit"
      workOrder={workOrder}
      tickets={referenceData.tickets}
      assets={referenceData.assets}
      locations={referenceData.locations}
      users={referenceData.users}
      items={referenceData.items}
    />
  );
}
