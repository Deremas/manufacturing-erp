import { PriceListsPage } from "@/features/master-data";
import { getPriceLists } from "@/lib/master-data-db";

export default async function MasterDataPriceListsPage() {
  const priceLists = await getPriceLists();
  return <PriceListsPage initialData={priceLists} />;
}
