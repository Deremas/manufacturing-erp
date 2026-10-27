import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/auth";
import { procurementViewUrl } from "@/lib/procurement/routes";
import { AssetRegistrationPage } from "@/features/procurement/AssetRegistrationPage";
import { getMaintenanceReferenceData } from "@/app/maintenance/_lib/reference-data";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";
import { listAssetReceiptsByGrn } from "@/services/procurement/asset-receipt.service";

export default async function RegisterAssetsFromGrnPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [receipt, assetReceipts, referenceData, user] = await Promise.all([
    getGoodsReceiptById(publicId),
    getGoodsReceiptById(publicId).then((doc) =>
      doc ? listAssetReceiptsByGrn(doc.id) : Promise.resolve([]),
    ),
    getMaintenanceReferenceData(),
    getCurrentUser(),
  ]);
  if (!receipt || receipt.status !== "POSTED" || !user) notFound();

  const unrestricted =
    user.permissions.includes("*") ||
    user.role.toLowerCase() === "admin" ||
    !user.accessibleLocationIds?.length;
  const locations = referenceData.locations.filter(
    (location) =>
      unrestricted || user.accessibleLocationIds?.includes(location.id),
  );

  return (
    <AssetRegistrationPage
      grnNo={receipt.grnNo}
      grnViewHref={procurementViewUrl("grn", receipt.publicId)}
      receipts={assetReceipts}
      assetTypes={referenceData.assetTypes.map((entry) => ({
        value: entry.id,
        label: `${entry.code} - ${entry.name}`,
      }))}
      assetCategories={referenceData.assetCategories.map((entry) => ({
        value: entry.id,
        label: `${entry.code} - ${entry.name}`,
        assetTypeId: entry.assetTypeId,
      }))}
      locations={locations.map((entry) => ({
        value: entry.id,
        label: `${entry.locationCode ?? ""} - ${entry.locationName}`.replace(
          /^ - /,
          "",
        ),
      }))}
      departments={referenceData.departments.map((entry) => ({
        value: entry.id,
        label: `${entry.code} - ${entry.name}`,
      }))}
      users={referenceData.users.map((entry) => ({
        value: entry.id,
        label: entry.name,
      }))}
    />
  );
}
