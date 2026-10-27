import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { TicketAssignPage } from "@/features/maintenance/WorkflowPages";
import { getMaintenanceTicketById } from "@/services/maintenance/maintenance.service";

export default async function AssignMaintenanceTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [referenceData, ticket] = await Promise.all([
    getMaintenanceReferenceData(),
    getMaintenanceTicketById(id),
  ]);

  return <TicketAssignPage ticket={ticket} users={referenceData.users} />;
}
