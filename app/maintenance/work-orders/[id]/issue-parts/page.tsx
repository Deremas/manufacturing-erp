import { MaintenanceWorkOrderIssuePartsPage } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById, getWorkOrderPartAvailability, listMaintenanceSpareRequests } from "@/services/maintenance/maintenance.service";

export default async function IssueMaintenanceWorkOrderPartsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, availability, spareRequests] = await Promise.all([
    getWorkOrderById(id),
    getWorkOrderPartAvailability(id),
    listMaintenanceSpareRequests(id),
  ]);

  const availabilityMap = new Map(availability.map((entry) => [entry.partId, entry.availableQty]));
  const hydrated = workOrder
    ? {
        ...workOrder,
        parts: workOrder.parts.map((part) => ({
          ...part,
          availableQty: availabilityMap.get(part.id) ?? 0,
        })),
      }
    : null;

  return <MaintenanceWorkOrderIssuePartsPage workOrder={hydrated} spareRequests={spareRequests} />;
}
