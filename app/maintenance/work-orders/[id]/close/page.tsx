import { WorkOrderLifecyclePage } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function CloseMaintenanceWorkOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkOrderLifecyclePage mode="close" workOrder={await getWorkOrderById(id)} />;
}
