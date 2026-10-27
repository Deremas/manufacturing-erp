import { WorkOrdersListPage } from "@/features/maintenance/WorkOrderPages";
import { getWorkOrders } from "@/services/maintenance/maintenance.service";

export const dynamic = "force-dynamic";

export default async function MaintenanceWorkOrdersPage() {
  const workOrders = await getWorkOrders();
  return <WorkOrdersListPage workOrders={workOrders} />;
}
