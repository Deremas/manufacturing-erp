import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { WorkOrderCompletePage } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function CompleteMaintenanceWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [referenceData, workOrder] = await Promise.all([
    getMaintenanceReferenceData(),
    getWorkOrderById(id),
  ]);

  return <WorkOrderCompletePage workOrder={workOrder} users={referenceData.users} />;
}
