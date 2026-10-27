import { getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { PriceListsPage } from "@/features/master-data";
import { getPriceLists } from "@/services/master-data/priceListService";

export default async function MasterDataPriceListsPage() {
  const [priceLists, locations, preferences] = await Promise.all([
    getPriceLists(),
    getLocations(),
    getSystemPreferences(),
  ]);

  return (
    <PriceListsPage
      initialData={priceLists}
      locations={locations}
      currencyCode={preferences.currencyCode}
    />
  );
}
