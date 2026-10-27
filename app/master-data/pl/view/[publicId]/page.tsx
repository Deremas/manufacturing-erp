import { notFound } from "next/navigation";

import { getSystemPreferences } from "@/lib/server/system-preferences";
import { PriceListDetail } from "@/features/master-data/components";
import {
  getPriceListById,
  getPriceListUsage,
} from "@/services/master-data/priceListService";

export default async function MasterDataPriceListViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const priceList = await getPriceListById(publicId);
  if (!priceList) notFound();

  const [usage, preferences] = await Promise.all([
    getPriceListUsage(priceList.id),
    getSystemPreferences(),
  ]);

  return (
    <PriceListDetail
      priceList={priceList}
      usage={usage}
      currencyCode={preferences.currencyCode}
    />
  );
}
