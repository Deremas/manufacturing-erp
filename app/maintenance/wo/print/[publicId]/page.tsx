import { MaintenanceWorkOrderPrintView } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function PrintMaintenanceWorkOrderPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const workOrder = await getWorkOrderById(publicId);
  return <MaintenanceWorkOrderPrintView workOrder={workOrder} />;
}
