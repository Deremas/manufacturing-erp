import { notFound } from "next/navigation";

import { getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { PriceListForm } from "@/features/master-data/components";
import {
  getCustomerGroups,
  getPriceListById,
  getSaleableItems,
} from "@/services/master-data/priceListService";

export default async function MasterDataPriceListEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const priceList = await getPriceListById(publicId);
  if (!priceList) notFound();

  const [saleableItems, customers, locations, customerGroups, preferences] =
    await Promise.all([
      getSaleableItems(),
      getCustomers(),
      getLocations(),
      getCustomerGroups(),
      getSystemPreferences(),
    ]);

  return (
    <PriceListForm
      mode="edit"
      initialData={priceList}
      saleableItems={saleableItems}
      customers={customers}
      locations={locations}
      customerGroups={customerGroups}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}
