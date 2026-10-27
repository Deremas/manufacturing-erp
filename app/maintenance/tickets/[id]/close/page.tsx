import { TicketClosePage } from "@/features/maintenance/WorkflowPages";
import { getMaintenanceTicketById } from "@/services/maintenance/maintenance.service";

export default async function CloseMaintenanceTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getMaintenanceTicketById(id);
  return <TicketClosePage ticket={ticket} />;
}
