import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { WorkOrderLifecyclePage } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function AssignMaintenanceWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [referenceData, workOrder] = await Promise.all([getMaintenanceReferenceData(), getWorkOrderById(id)]);
  return <WorkOrderLifecyclePage mode="assign" workOrder={workOrder} users={referenceData.users} />;
}
