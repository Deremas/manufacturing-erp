import { AssetAssignmentReturnPage } from "@/features/maintenance/AssetLifecyclePages";
import { getAssetAssignmentById } from "@/services/maintenance/asset-lifecycle.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assignment = await getAssetAssignmentById(id);
  return <AssetAssignmentReturnPage assignment={assignment} />;
}
