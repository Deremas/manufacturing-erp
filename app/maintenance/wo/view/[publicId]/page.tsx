import { WorkOrderDetailPage } from "@/features/maintenance/WorkOrderPages";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function MaintenanceWorkOrderViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const workOrder = await getWorkOrderById(publicId);
  return <WorkOrderDetailPage workOrder={workOrder} />;
}
