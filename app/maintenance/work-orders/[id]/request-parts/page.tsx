import { MaintenanceSpareRequestPage } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById, listMaintenanceSpareRequests } from "@/services/maintenance/maintenance.service";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, requests] = await Promise.all([getWorkOrderById(id), listMaintenanceSpareRequests(id)]);
  return <MaintenanceSpareRequestPage workOrder={workOrder} requests={requests} />;
}
