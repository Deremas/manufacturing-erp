import { TicketFormPage } from "@/features/maintenance/MaintenancePages";
import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { getMaintenanceTicketById } from "@/services/maintenance/maintenance.service";

export default async function EditMaintenanceTicketPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [referenceData, ticket] = await Promise.all([
    getMaintenanceReferenceData(),
    getMaintenanceTicketById(publicId),
  ]);

  return (
    <TicketFormPage
      mode="edit"
      ticket={ticket}
      assets={referenceData.assets}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
    />
  );
}
