import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { AssetAssignmentFormPage } from "@/features/maintenance/AssetLifecyclePages";
import { getAssetAssignmentById } from "@/services/maintenance/asset-lifecycle.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, data] = await Promise.all([params, getMaintenanceReferenceData()]);
  const assignment = await getAssetAssignmentById(id);
  return <AssetAssignmentFormPage assets={data.assets} users={data.users} departments={data.departments} locations={data.locations} assignment={assignment} />;
}
