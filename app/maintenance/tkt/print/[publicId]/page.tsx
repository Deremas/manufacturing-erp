import { MaintenanceTicketPrintView } from "@/features/maintenance/WorkflowPages";
import { getMaintenanceTicketById } from "@/services/maintenance/maintenance.service";

export default async function PrintMaintenanceTicketPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const ticket = await getMaintenanceTicketById(publicId);
  return <MaintenanceTicketPrintView ticket={ticket} />;
}
