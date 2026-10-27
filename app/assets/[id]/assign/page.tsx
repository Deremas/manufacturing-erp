import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { AssetAssignmentFormPage } from "@/features/maintenance/AssetLifecyclePages";

export const dynamic = "force-dynamic";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, data] = await Promise.all([params, getMaintenanceReferenceData()]);
  return <AssetAssignmentFormPage assets={data.assets} users={data.users} departments={data.departments} locations={data.locations} presetAssetId={id} />;
}
