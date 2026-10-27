import { notFound } from "next/navigation";

import { AssetTransferDetailPage } from "@/features/maintenance/AssetLifecyclePages";
import { getAssetTransferById } from "@/services/maintenance/asset-lifecycle.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const transfer = await getAssetTransferById(publicId);
  if (!transfer) notFound();
  return <AssetTransferDetailPage transfer={transfer} />;
}
