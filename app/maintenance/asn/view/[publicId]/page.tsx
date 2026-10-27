import { notFound } from "next/navigation";

import { AssetAssignmentDetailPage } from "@/features/maintenance/AssetLifecyclePages";
import { getAssetAssignmentById } from "@/services/maintenance/asset-lifecycle.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const assignment = await getAssetAssignmentById(publicId);
  if (!assignment) notFound();
  return <AssetAssignmentDetailPage assignment={assignment} />;
}
