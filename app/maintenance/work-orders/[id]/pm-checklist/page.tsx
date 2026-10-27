import { PMChecklistPage } from "@/features/maintenance/PMChecklistPage";
import { getPreventiveMaintenanceChecklist, getWorkOrderById } from "@/services/maintenance/maintenance.service";

export default async function MaintenanceWorkOrderPMChecklistRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, items] = await Promise.all([getWorkOrderById(id), getPreventiveMaintenanceChecklist(id)]);
  return <PMChecklistPage workOrder={workOrder} initialItems={items} />;
}
