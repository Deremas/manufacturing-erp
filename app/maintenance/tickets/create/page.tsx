import { TicketFormPage } from "@/features/maintenance/MaintenancePages";
import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";

export default async function CreateMaintenanceTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ assetId?: string }>;
}) {
  const [{ assetId }, referenceData] = await Promise.all([
    searchParams,
    getMaintenanceReferenceData(),
  ]);

  return (
    <TicketFormPage
      mode="create"
      assets={referenceData.assets}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
      presetAssetId={assetId}
    />
  );
}
