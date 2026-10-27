import { TicketsListPage } from "@/features/maintenance/MaintenancePages";
import { getMaintenanceTickets } from "@/services/maintenance/maintenance.service";

export const dynamic = "force-dynamic";

export default async function MaintenanceTicketsPage() {
  const tickets = await getMaintenanceTickets();
  return <TicketsListPage tickets={tickets} />;
}
