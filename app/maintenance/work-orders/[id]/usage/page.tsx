import { MaintenanceWorkOrderPartUsagePage } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function MaintenanceWorkOrderUsagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MaintenanceWorkOrderPartUsagePage workOrder={await getWorkOrderById(id)} />;
}
