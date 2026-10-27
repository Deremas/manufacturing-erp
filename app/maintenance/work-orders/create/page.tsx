import { WorkOrderFormPage } from "@/features/maintenance/WorkOrderPages";
import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";

export default async function CreateMaintenanceWorkOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ ticketId?: string }>;
}) {
  const [{ ticketId }, referenceData] = await Promise.all([searchParams, getMaintenanceReferenceData()]);
  const presetTicket = ticketId ? referenceData.tickets.find((entry) => entry.id === ticketId) ?? null : null;

  return (
    <WorkOrderFormPage
      mode="create"
      tickets={referenceData.tickets}
      assets={referenceData.assets}
      locations={referenceData.locations}
      users={referenceData.users}
      items={referenceData.items}
      presetTicket={presetTicket}
    />
  );
}
