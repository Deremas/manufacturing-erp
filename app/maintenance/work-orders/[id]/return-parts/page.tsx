import { MaintenanceWorkOrderReturnPartsPage } from "@/features/maintenance/WorkflowPages";
import { getWorkOrderById, getWorkOrderPartAvailability } from "@/services/maintenance/maintenance.service";

export default async function ReturnMaintenanceWorkOrderPartsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [workOrder, availability] = await Promise.all([
    getWorkOrderById(id),
    getWorkOrderPartAvailability(id),
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

  return <MaintenanceWorkOrderReturnPartsPage workOrder={hydrated} />;
}
