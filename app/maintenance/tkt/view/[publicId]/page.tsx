import { TicketDetailPage } from "@/features/maintenance/MaintenancePages";
import { getMaintenanceTicketById } from "@/services/maintenance/maintenance.service";

export default async function MaintenanceTicketViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const ticket = await getMaintenanceTicketById(publicId);
  return <TicketDetailPage ticket={ticket} />;
}
